// @file utf8_stream_processor.hpp
// @description Utf8StreamProcessor: 累积不完整字节，按 UTF-8 头字节切分完整字符后回调，处理多字节字符被打断的情况。
//
// [WHO] 定义 `class eyes::Utf8StreamProcessor`、`processStream(str, len)`、`static utf8CharLength(byte): int`
// [FROM] 依赖 `<functional/string>`
// [TO] 被 `eyes_llm_session.cpp` 在拿到 LLM 流式输出后做 UTF-8 切分
// [HERE] android/app/src/main/cpp/utf8_stream_processor.hpp · UTF-8 流处理（header-only）
#pragma once
#include <functional>
#include <string>

namespace eyes {

class Utf8StreamProcessor {
public:
    explicit Utf8StreamProcessor(std::function<void(const std::string&)> callback)
        : callback_(std::move(callback)) {}

    void processStream(const char* str, size_t len) {
        utf8_buffer_.append(str, len);
        size_t i = 0;
        std::string complete_chars;
        while (i < utf8_buffer_.size()) {
            int length = utf8CharLength(static_cast<unsigned char>(utf8_buffer_[i]));
            if (length == 0 || i + static_cast<size_t>(length) > utf8_buffer_.size()) {
                break;
            }
            complete_chars.append(utf8_buffer_, i, static_cast<size_t>(length));
            i += static_cast<size_t>(length);
        }
        utf8_buffer_ = utf8_buffer_.substr(i);
        if (!complete_chars.empty()) {
            callback_(complete_chars);
        }
    }

    static int utf8CharLength(unsigned char byte) {
        if ((byte & 0x80) == 0) return 1;
        if ((byte & 0xE0) == 0xC0) return 2;
        if ((byte & 0xF0) == 0xE0) return 3;
        if ((byte & 0xF8) == 0xF0) return 4;
        return 0;
    }

private:
    std::string utf8_buffer_;
    std::function<void(const std::string&)> callback_;
};

}  // namespace eyes
