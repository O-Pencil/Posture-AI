# android/app/src/main/cpp · AGENTS.md

> 模块：C++ / JNI 桥接层
> 协议层级：DIP · P2（模块地图）
> 父文档：[../../../../../../AGENTS.md](../../../../../../AGENTS.md)
> 命名空间：`eyes`（来自 "Catune" 历史代号，保留兼容）
> 共享库产物：`libeyes_mnn_bridge.so`（+ 已预置的 `libMNN.so` 在 `jniLibs/arm64-v8a/`）

7 个源文件，分三层：JNI 桥接 → LLM 会话封装 → 流式处理工具。

---

## 1. JNI 入口层

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `eyes_mnn_bridge.cpp` | JNI 入口，把 Kotlin 侧的 `runInference / nativeInit / nativeRelease / getLastError / getLastInferenceMetric / calculateSpineAnglesNative` 路由到 C++ 实现；处理 `byte[]` ↔ 文件落盘（图片/PCM-WAV） | `JNIEnv`、`std::mutex g_mutex` 单例 session、4-byte `WAV` 头写入 |
| `CMakeLists.txt` | CMake 3.22.1 配置：构建 `posture_ai_bridge` 共享库，链接外部 `MNN` IMPORTED（从 `jniLibs/${ANDROID_ABI}/libMNN.so`），包含 `llm.hpp` 头，启用 C++17、`max-page-size=16384` | `add_library(SHARED/IMPORTED)`、`target_link_options` |

## 2. LLM 会话封装层

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `eyes_llm_session.h` | `EyesLlmSession` 类声明：`load(config_json_path, cache_dir)` / `unload()` / `infer(prompt, image_path, audio_path)` / `getMetric(key)`；`void* llm_` 指向 `MNN::Transformer::Llm*` | `std::mutex` 保护、`unordered_map<string,string> metrics_` |
| `eyes_llm_session.cpp` | 真正调 MNN LLM，处理 `<eop>` 结束符、UTF-8 流回调、配置 JSON 内嵌（`max_new_tokens=256`、`thread_num=4`、`precision=low`、`memory=low`） | `MNN::Transformer::Llm/LlmContext/LlmStatus`、`StreamState` 结构、`resolveEop()` 恢复 RUNNING 状态 |

## 3. 流式处理工具层

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `llm_stream_buffer.hpp` | `LlmStreamBuffer : std::streambuf`，把 MNN LLM 的 `std::ostream` 输出重定向到 `std::function<void(const char*, size_t)>` 回调 | 单 `xsputn` 重写 |
| `utf8_stream_processor.hpp` | `Utf8StreamProcessor`：累积不完整字节，按 UTF-8 头字节切分完整字符后回调，处理多字节字符不被打断 | `utf8CharLength()` 头字节判断 |
| `eyes_log.h` | Android `__android_log_print` 宏：`EYES_LOGD` / `EYES_LOGE`，tag `"CatuneMNN"` | 仅头文件、零运行时开销 |

---

## 4. 构建依赖

```
eyes_mnn_bridge (SHARED)
    ├── eyes_llm_session (内部)
    ├── LlmStreamBuffer (header-only)
    ├── Utf8StreamProcessor (header-only)
    └── MNN (IMPORTED, jniLibs/arm64-v8a/libMNN.so)
            ↓
        libMNN.so（7.4MB，arm64-v8a）
```

> 注意：`MNN_SOURCE_ROOT` 在 `CMakeLists.txt` 指向 `${CMAKE_CURRENT_SOURCE_DIR}/../../../../../../Template-github/eyes-on-my-phone/MNN-master`，**首次 clone 后需先准备 MNN 头文件目录**；否则仅靠预编译的 `libMNN.so` 也能跑（只缺 `Llm` 类声明会编译失败，需保留头文件）。

---

## 5. 与 Kotlin 侧的契约

| Kotlin 侧 `external fun` | C++ 侧 JNI 实现（`eyes_mnn_bridge.cpp`） |
| --- | --- |
| `nativeInit(configPath, cacheDir): Boolean` | 初始化 `EyesLlmSession::load()`，返回是否成功 |
| `nativeRelease()` | 调 `EyesLlmSession::unload()` |
| `runInference(modelPath, imageJpeg, audioPcm, sampleRate, prompt): String?` | 把 jbyteArray 落盘到 cacheDir，调 `infer()`，返回完整文本 |
| `getLastInferenceMetric(key): String?` | 读 `metrics_` 表 |
| `getLastError(): String?` | 读 `g_last_error` |
| `MainActivity.calculateSpineAnglesNative(rawQuaternions: FloatArray): FloatArray` | 占位桩：在 stub 模式下返回空 `FloatArray(0)`，让 BLE 数据流走到 heuristic 降级路径 |

---

## 6. 维护纪律

- 修改 JNI 函数签名 → 同步修改 `MnnPerceptionEngine.kt` / `MainActivity.kt` 的 `external fun` 声明。
- MNN 版本升级 → 重新 `import` 头文件 + 替换 `libMNN.so`。
- 流式协议变更（`<eop>` 标记）→ 同时检查 `LlmStreamBuffer` 与 `EyesLlmSession` 的状态恢复逻辑。
