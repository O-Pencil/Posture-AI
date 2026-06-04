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

private:
    mutable std::mutex mutex_;
    bool ready_ = false;
    std::string cache_dir_;
    std::string last_error_;
    std::unordered_map<std::string, std::string> metrics_;

    void* llm_ = nullptr;  // MNN::Transformer::Llm*
};

}  // namespace eyes
