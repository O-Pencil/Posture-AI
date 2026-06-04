// @file llm_stream_buffer.hpp
// @description LlmStreamBuffer: std::streambuf 子类，把 MNN Llm 的 std::ostream 输出重定向到 std::function<void(const char*, size_t)> 回调。
//
// [WHO] 定义 `class LlmStreamBuffer : std::streambuf`、`using CallBack`、`重写 xsputn`
// [FROM] 依赖 `<functional/ostream/streambuf>`
// [TO] 被 `eyes_llm_session.cpp` 用于接管 MNN Llm 的输出流
// [HERE] android/app/src/main/cpp/llm_stream_buffer.hpp · MNN 输出流回调桥（header-only）
#pragma once
#include <functional>
#include <ostream>
#include <streambuf>

class LlmStreamBuffer : public std::streambuf {
public:
    using CallBack = std::function<void(const char*, size_t)>;

    explicit LlmStreamBuffer(CallBack callback) : callback_(std::move(callback)) {}

protected:
    std::streamsize xsputn(const char* s, std::streamsize n) override {
        if (callback_) {
            callback_(s, static_cast<size_t>(n));
        }
        return n;
    }

private:
    CallBack callback_ = nullptr;
};
