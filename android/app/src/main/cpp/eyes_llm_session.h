// @file eyes_llm_session.h
// @description EyesLlmSession 类声明：load/unload/isReady/lastError/infer/getMetric；`void* llm_` 指向 MNN::Transformer::Llm*。
//
// [WHO] 声明 `class eyes::EyesLlmSession`、`load(config_json_path, cache_dir): bool` / `unload()` / `isReady() const` / `lastError() const` / `infer(user_prompt, image_jpeg_path, audio_wav_path): std::string` / `getMetric(key) const`
// [FROM] 依赖 `<mutex/string/unordered_map>`
// [TO] 被 `eyes_mnn_bridge.cpp` 与 `eyes_llm_session.cpp` 实现/调用
// [HERE] android/app/src/main/cpp/eyes_llm_session.h · LLM 会话接口
#pragma once

#include <mutex>
#include <string>
#include <unordered_map>

namespace eyes {

struct CpuCapability {
    bool probe_ok = false;
    bool fp16 = false;
    bool dot = false;
    bool i8mm = false;
    bool sve2 = false;
    bool sme2_hw = false;
    bool lib_sme2 = false;
    std::string backend_label;
    std::string readiness;  // human-readable SME2 verdict
};

CpuCapability queryCpuCapability();

class EyesLlmSession {
public:
    bool load(const std::string& config_json_path, const std::string& cache_dir);
    void unload();
    bool isReady() const { return ready_; }
    const std::string& lastError() const { return last_error_; }

    std::string infer(
        const std::string& user_prompt,
        const std::string& image_jpeg_path,
        const std::string& audio_wav_path);

    std::string getMetric(const std::string& key) const;

    /** infer 进行中正在生成的部分文本（供上层轮询做流式显示）。线程安全，与 infer 的 mutex_ 不互斥。 */
    std::string getPartial() const;

private:
    mutable std::mutex mutex_;
    bool ready_ = false;
    std::string cache_dir_;
    std::string last_error_;
    std::unordered_map<std::string, std::string> metrics_;

    mutable std::mutex partial_mutex_;
    std::string partial_;  // 流式：infer 中由输出流回调逐段累加

    void* llm_ = nullptr;  // MNN::Transformer::Llm*
};

}  // namespace eyes
