// @file eyes_llm_session.cpp
// @description EyesLlmSession 实现：把 MNN Llm 包装成 load/unload/infer/getMetric 接口，处理 <eop> 结束符、UTF-8 流回调、内嵌配置 JSON。
//
// [WHO] 实现 `eyes::EyesLlmSession::load/unload/isReady/lastError/infer/getMetric`，匿名 namespace 内 `restoreRunningIfNeeded` / `StreamState::processChunk/finalize` / `resolveEop` / `buildRuntimeConfig`
// [FROM] 依赖 MNN Transformer 头（`llm/llm.hpp`）、`llm_stream_buffer.hpp`、`utf8_stream_processor.hpp`、`eyes_log.h`、`<chrono/fstream/sstream/utility/vector>`
// [TO] 被 `eyes_mnn_bridge.cpp` 通过 `g_session` 单例调用
// [HERE] android/app/src/main/cpp/eyes_llm_session.cpp · MNN LLM 会话封装
#include "eyes_llm_session.h"

#include <chrono>
#include <fstream>
#include <sstream>
#include <utility>
#include <vector>

#include "eyes_log.h"
#include "llm/llm.hpp"
#include "llm_stream_buffer.hpp"
#include "utf8_stream_processor.hpp"

using MNN::Transformer::Llm;
using MNN::Transformer::LlmContext;
using MNN::Transformer::LlmStatus;

namespace {

void restoreRunningIfNeeded(Llm* llm) {
    if (llm == nullptr) return;
    auto* context = llm->getContext();
    if (context == nullptr) return;
    if (context->status == LlmStatus::MAX_TOKENS_FINISHED ||
        context->status == LlmStatus::NORMAL_FINISHED) {
        auto* mutable_context = const_cast<LlmContext*>(context);
        mutable_context->status = LlmStatus::RUNNING;
    }
}

struct StreamState {
    std::stringstream& buffer;
    bool& finished;
    bool& stop_requested;
    bool pending_eop = false;

    void processChunk(const std::string& utf8_char) {
        if (utf8_char.find("<eop>") != std::string::npos) {
            pending_eop = true;
            return;
        }
        buffer << utf8_char;
    }

    void finalize() {
        if (pending_eop) {
            finished = true;
            pending_eop = false;
        }
    }
};

void resolveEop(Llm* llm,
                StreamState& state,
                int current_size,
                int max_new_tokens,
                const std::stringstream& response_buffer) {
    auto* context = llm != nullptr ? llm->getContext() : nullptr;
    if (context != nullptr &&
        context->status == LlmStatus::MAX_TOKENS_FINISHED &&
        !state.stop_requested &&
        current_size < max_new_tokens) {
        restoreRunningIfNeeded(llm);
        if (state.pending_eop) {
            state.finished = false;
            state.pending_eop = false;
        }
        return;
    }
    if (context != nullptr &&
        context->status == LlmStatus::NORMAL_FINISHED &&
        !state.pending_eop &&
        !state.stop_requested &&
        current_size < max_new_tokens) {
        restoreRunningIfNeeded(llm);
        return;
    }
    // Prebuilt Android runtime may emit <eop> after only a fence prefix (e.g. "```").
    if (state.pending_eop &&
        response_buffer.str().size() < 48 &&
        current_size < max_new_tokens) {
        restoreRunningIfNeeded(llm);
        state.finished = false;
        state.pending_eop = false;
        return;
    }
    if (state.pending_eop) {
        state.finalize();
    }
}

std::string buildRuntimeConfig() {
    return R"({
        "max_new_tokens": 256,
        "thread_num": 4,
        "precision": "low",
        "memory": "low",
        "use_mmap": false,
        "keep_history": false
    })";
}

}  // namespace

namespace eyes {

bool EyesLlmSession::load(const std::string& config_json_path, const std::string& cache_dir) {
    std::lock_guard<std::mutex> lock(mutex_);
    unload();

    cache_dir_ = cache_dir;
    auto* llm = Llm::createLLM(config_json_path);
    if (llm == nullptr) {
        last_error_ = "createLLM failed for: " + config_json_path;
        EYES_LOGE("%s", last_error_.c_str());
        return false;
    }

    if (!llm->set_config(buildRuntimeConfig())) {
        last_error_ = "set_config failed";
        Llm::destroy(llm);
        EYES_LOGE("%s", last_error_.c_str());
        return false;
    }

    if (!llm->load()) {
        last_error_ = "llm load() failed for: " + config_json_path;
        Llm::destroy(llm);
        EYES_LOGE("%s", last_error_.c_str());
        return false;
    }

    llm_ = llm;
    ready_ = true;
    last_error_.clear();
    EYES_LOGD("EyesLlmSession loaded: %s", config_json_path.c_str());
    return true;
}

void EyesLlmSession::unload() {
    if (llm_ != nullptr) {
        Llm::destroy(static_cast<Llm*>(llm_));
        llm_ = nullptr;
    }
    ready_ = false;
    metrics_.clear();
}

std::string EyesLlmSession::infer(
    const std::string& user_prompt,
    const std::string& image_jpeg_path,
    const std::string& audio_wav_path) {
    std::lock_guard<std::mutex> lock(mutex_);
    metrics_.clear();

    if (!ready_ || llm_ == nullptr) {
        last_error_ = "Model not loaded";
        return "";
    }

    auto* llm = static_cast<Llm*>(llm_);
    llm->reset();

    std::string prompt = user_prompt;
    if (!image_jpeg_path.empty()) {
        prompt = "<img>" + image_jpeg_path + "</img>\n" + prompt;
    }
    if (!audio_wav_path.empty()) {
        prompt = "<audio>" + audio_wav_path + "</audio>\n" + prompt;
    }

    const int max_new_tokens = 256;
    bool stop_requested = false;
    bool generate_text_end = false;
    std::stringstream response_buffer;

    StreamState stream_state{response_buffer, generate_text_end, stop_requested};
    eyes::Utf8StreamProcessor processor([&stream_state](const std::string& utf8_char) {
        stream_state.processChunk(utf8_char);
    });
    LlmStreamBuffer stream_buffer([&processor](const char* str, size_t len) {
        processor.processStream(str, len);
    });
    std::ostream output_ostream(&stream_buffer);

    MNN::Transformer::ChatMessages history;
    history.emplace_back("user", prompt);

    restoreRunningIfNeeded(llm);
    llm->response(history, &output_ostream, "<eop>", 0);

    int current_size = 0;
    resolveEop(llm, stream_state, current_size, max_new_tokens, response_buffer);
    while (!stop_requested && !generate_text_end && current_size < max_new_tokens) {
        llm->generate(1);
        current_size++;
        resolveEop(llm, stream_state, current_size, max_new_tokens, response_buffer);
    }
    stream_state.finalize();

    const auto* context = llm->getContext();
    if (context != nullptr) {
        metrics_["ttft_ms"] = std::to_string(context->ttfa_us / 1000);
        metrics_["prefill_ms"] = std::to_string(context->prefill_us / 1000);
        metrics_["decode_ms"] = std::to_string(context->decode_us / 1000);
        metrics_["vision_ms"] = std::to_string(context->vision_us / 1000);
        metrics_["audio_ms"] = std::to_string(context->audio_us / 1000);
        metrics_["tokens_generated"] = std::to_string(context->gen_seq_len);
        if (context->decode_us > 0) {
            float tps = static_cast<float>(context->gen_seq_len) * 1e6f /
                        static_cast<float>(context->decode_us);
            metrics_["decode_tps"] = std::to_string(tps);
        }
    }

    std::string result = response_buffer.str();
    if (result.empty()) {
        last_error_ = "Empty model response";
        EYES_LOGE("%s", last_error_.c_str());
    } else {
        last_error_.clear();
        std::string preview = result.size() > 240 ? result.substr(0, 240) + "..." : result;
        EYES_LOGD("Inference done, chars=%zu tokens=%s preview=%s",
                  result.size(),
                  metrics_["tokens_generated"].c_str(),
                  preview.c_str());
    }
    return result;
}

std::string EyesLlmSession::getMetric(const std::string& key) const {
    std::lock_guard<std::mutex> lock(mutex_);
    auto it = metrics_.find(key);
    if (it == metrics_.end()) return "";
    return it->second;
}

}  // namespace eyes
