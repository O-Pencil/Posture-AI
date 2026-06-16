// @file eyes_llm_session.cpp
// @description EyesLlmSession 实现：把 MNN Llm 包装成 load/unload/infer/getMetric 接口，处理 <eop> 结束符、UTF-8 流回调、内嵌配置 JSON。
//
// [WHO] 实现 `eyes::EyesLlmSession::load/unload/isReady/lastError/infer/getMetric`，匿名 namespace 内 `restoreRunningIfNeeded` / `StreamState::processChunk/finalize` / `resolveEop` / `buildRuntimeConfig`
// [FROM] 依赖 MNN Transformer 头（`llm/llm.hpp`）、`llm_stream_buffer.hpp`、`utf8_stream_processor.hpp`、`eyes_log.h`、`<chrono/fstream/sstream/utility/vector>`
// [TO] 被 `eyes_mnn_bridge.cpp` 通过 `g_session` 单例调用
// [HERE] android/app/src/main/cpp/eyes_llm_session.cpp · MNN LLM 会话封装
#include "eyes_llm_session.h"

#include <chrono>
#include <dlfcn.h>
#include <fstream>
#include <functional>
#include <ostream>
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

struct MNNCPUInfo {
    bool fp16arith = false;
    bool dot = false;
    bool i8mm = false;
    bool sve2 = false;
    bool sme2 = false;
};

using MNNGetCPUInfoFn = const MNNCPUInfo* (*)();

MNNGetCPUInfoFn resolveMNNGetCPUInfoFn() {
    static MNNGetCPUInfoFn fn = nullptr;
    static bool resolved = false;
    if (resolved) return fn;
    resolved = true;
    void* handle = dlopen("libMNN.so", RTLD_NOW | RTLD_NOLOAD);
    if (handle == nullptr) {
        handle = dlopen("libMNN.so", RTLD_NOW);
    }
    if (handle != nullptr) {
        fn = reinterpret_cast<MNNGetCPUInfoFn>(dlsym(handle, "MNNGetCPUInfo"));
    }
    if (fn == nullptr) {
        fn = reinterpret_cast<MNNGetCPUInfoFn>(dlsym(RTLD_DEFAULT, "MNNGetCPUInfo"));
    }
    return fn;
}

bool readHwSme2FromProc() {
    std::ifstream cpuinfo("/proc/cpuinfo");
    if (!cpuinfo.is_open()) return false;
    std::string line;
    while (std::getline(cpuinfo, line)) {
        if (line.find("Features") == std::string::npos && line.find("features") == std::string::npos) {
            continue;
        }
        if (line.find("sme2") != std::string::npos) return true;
    }
    return false;
}

const MNNCPUInfo* queryMNNCPUInfo() {
    MNNGetCPUInfoFn fn = resolveMNNGetCPUInfoFn();
    if (fn == nullptr) return nullptr;
    return fn();
}

bool libSme2Compiled() {
#ifdef CATUNE_MNN_LIB_SME2
    return true;
#else
    return false;
#endif
}

std::string getBackendName() {
    const MNNCPUInfo* info = queryMNNCPUInfo();
    const bool hw_sme2 = (info != nullptr && info->sme2) || readHwSme2FromProc();
    if (hw_sme2 && libSme2Compiled()) return "SME2";
    if (info && (info->fp16arith || info->dot)) return "NEON";
    return "CPU";
}

eyes::CpuCapability queryCpuCapabilityImpl() {
    eyes::CpuCapability cap;
    cap.lib_sme2 = libSme2Compiled();
    const MNNCPUInfo* info = queryMNNCPUInfo();
    if (info != nullptr) {
        cap.probe_ok = true;
        cap.fp16 = info->fp16arith;
        cap.dot = info->dot;
        cap.i8mm = info->i8mm;
        cap.sve2 = info->sve2;
        cap.sme2_hw = info->sme2;
    } else {
        cap.sme2_hw = readHwSme2FromProc();
        cap.probe_ok = cap.sme2_hw || cap.lib_sme2;
    }
    cap.backend_label = getBackendName();
    if (cap.sme2_hw && cap.lib_sme2) {
        cap.readiness = "SME2 ready (hw+lib)";
    } else if (cap.sme2_hw) {
        cap.readiness = "hw SME2 yes, lib SME2 no";
    } else if (cap.lib_sme2) {
        cap.readiness = cap.probe_ok
            ? "lib SME2 yes, hw no (emulator/NEON)"
            : "lib SME2 yes, probe unavailable";
    } else {
        cap.readiness = "NEON/CPU only";
    }
    EYES_LOGD("CPU cap: fp16=%d dot=%d i8mm=%d sve2=%d sme2_hw=%d lib_sme2=%d backend=%s",
              cap.fp16, cap.dot, cap.i8mm, cap.sve2, cap.sme2_hw, cap.lib_sme2, cap.backend_label.c_str());
    return cap;
}

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

std::string formatQwenInstructPrompt(const std::string& system, const std::string& user) {
    constexpr const char* kImEnd = "<|im_end|>";
    return std::string("<|im_start|>system\n") + system + kImEnd +
           "\n<|im_start|>user\n" + user + kImEnd + "\n<|im_start|>assistant\n";
}

std::string buildRuntimeConfig(const std::string& cache_dir) {
    return R"({
        "max_new_tokens": 64,
        "max_all_tokens": 512,
        "thread_num": 4,
        "precision": "low",
        "memory": "low",
        "sampler_type": "penalty",
        "penalty": 1.1,
        "penalty_sampler": "temperature",
        "temperature": 0.7,
        "use_template": false,
        "use_mmap": true,
        "tmp_path": ")" + cache_dir + R"(",
        "async": false
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

    if (!llm->set_config(buildRuntimeConfig(cache_dir))) {
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

    EYES_LOGD("EyesLlmSession dump_config: %s", llm->dump_config().c_str());

    llm_ = llm;
    ready_ = true;
    metrics_["backend"] = getBackendName();
    last_error_.clear();
    EYES_LOGD("EyesLlmSession loaded: %s, backend: %s", config_json_path.c_str(), metrics_["backend"].c_str());
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
    metrics_["backend"] = getBackendName();

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

    const std::string formatted_prompt =
        formatQwenInstructPrompt("You are a helpful assistant.", prompt);
    const std::string prompt_preview =
        formatted_prompt.size() > 400 ? formatted_prompt.substr(0, 400) + "..." : formatted_prompt;
    EYES_LOGD("Formatted prompt preview: %s", prompt_preview.c_str());

    const std::vector<int> prompt_ids = llm->tokenizer_encode(formatted_prompt);
    EYES_LOGD("Prompt token count: %zu", prompt_ids.size());
    for (size_t i = 0; i < std::min(prompt_ids.size(), size_t(6)); ++i) {
        EYES_LOGD("Prompt tok[%zu] id=%d piece=%s", i, prompt_ids[i], llm->tokenizer_decode(prompt_ids[i]).c_str());
    }

    // 流式：把 MNN 输出流接到 partial_，供上层轮询逐段显示
    {
        std::lock_guard<std::mutex> lk(partial_mutex_);
        partial_.clear();
    }
    LlmStreamBuffer stream_buffer([this](const char* s, size_t n) {
        std::lock_guard<std::mutex> lk(partial_mutex_);
        partial_.append(s, n);
    });
    std::ostream stream_os(&stream_buffer);
    llm->response(formatted_prompt, &stream_os);

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
        if (!context->output_tokens.empty()) {
            std::ostringstream token_log;
            const size_t n = std::min<size_t>(context->output_tokens.size(), 8);
            for (size_t i = 0; i < n; ++i) {
                if (i > 0) token_log << ',';
                token_log << context->output_tokens[i];
            }
            EYES_LOGD("First output token ids: %s", token_log.str().c_str());
        }
    }

    std::string result = context != nullptr ? context->generate_str : "";
    if (result.empty()) {
        result = getPartial();
    }
    if (context != nullptr && context->status == LlmStatus::INTERNAL_ERROR) {
        last_error_ = "LLM internal error at prefill/decode (often OOM on emulator). "
                      "Use arm64 device or raise AVD RAM; max_all_tokens=512 on this build.";
        EYES_LOGE("%s", last_error_.c_str());
    } else if (result.empty()) {
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

std::string EyesLlmSession::getPartial() const {
    std::lock_guard<std::mutex> lock(partial_mutex_);
    return partial_;
}

CpuCapability queryCpuCapability() {
    return queryCpuCapabilityImpl();
}

}  // namespace eyes
