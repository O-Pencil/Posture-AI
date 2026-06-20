# CatuneMnn（iOS 端侧推理桥 · 骨架）

端侧 Qwen+MNN 推理的 iOS RN 原生模块**骨架**，方法名/事件名与安卓 `MnnDebugModule` 完全一致，
JS 侧（`src/mnn/*`、`inferStreamClient`）接通后**零改动**。

- 现状：占位实现，方法返回「未接入（复赛）」。**目标 A（iOS UI/云端/规则 demo）不需要它**。
- 接入（复赛）：见 [docs/iOS适配评估与计划.md](../../docs/iOS适配评估与计划.md) §3/§4。
  1. 编 MNN iOS 静态库/framework（`MNN_BUILD_LLM` + KleidiAI）。
  2. 把安卓共享的 C++ 核 `eyes_llm_session.{h,cpp}` / `llm_stream_buffer.hpp` / `utf8_stream_processor.hpp` 加入 iOS target（建议软链/Podspec，避免拷贝两份）。
  3. `expo prebuild -p ios` 后，把本目录的 `.h/.mm` 加入 `PostureAI` target（或写成本地 Pod / config plugin）。
  4. 把 TODO 换成对 `eyes::EyesLlmSession` 的真实调用。
