# iOS（iPhone 16 Pro）适配评估与计划

> 版本：2026-06-20
> 目标：初赛能用 iPhone 16 Pro 跑「UI + 云端评估 + 规则教练 + 传感器」demo（目标 A）；复赛补端侧 Qwen+MNN 推理（目标 B）。
> 关联：[初赛参赛文档](./初赛参赛文档.md) · [联调进度与实测记录](./联调进度与实测记录.md)

---

## 1. 现状分层（决定工作量）

| 层 | iOS 现状 | 说明 |
| --- | --- | --- |
| TS 业务/UI（Desk/Plant/Monitor/Settings、雪碧图猫、规则引擎、记忆、成长、提醒、日志、onboarding） | ✅ 跨平台 | 一套 TS，iOS 直接跑 |
| 手机传感器 `expo-sensors` DeviceMotion | ✅ | iPhone 已验证可用 |
| 云端 AI 评估（fetch + `expo-image-picker`） | ✅ | iOS 支持，需相机/相册权限 |
| 模型下载 `expo-file-system` | ✅ | iOS 支持 |
| 震动提醒 RN `Vibration` | ✅ | iOS 基础震动 |
| **端侧 Qwen+MNN 推理**（`CatuneMnn` 原生模块） | ❌ 仅安卓 | iOS 无此原生模块 → 文案走规则、基准面板预览态、端侧 VL 不可用 |

> 关键：C++ 推理核 `android/app/src/main/cpp/eyes_llm_session.cpp`（+`llm_stream_buffer`/`utf8_stream_processor`）是**可移植的**；只有 JNI 桥 `eyes_mnn_bridge.cpp` 是安卓专属。MNN 本身支持 iOS。iPhone 16 Pro 的 A18 Pro **有 SME、无 SME2**（SME2 目前仅 M4）→ iOS 端侧只能 NEON/SME，SME2 考核点继续用安卓口径。

---

## 2. 目标 A：iPhone 16 Pro 跑 UI/云端/规则 demo（初赛）

iOS 上 `NativeModules.CatuneMnn` 为 undefined，全链路已优雅降级：教练文案=规则（带「喵～」）、评估=云端/示例、基准=预览态，**其余全部可演示**。

### 步骤（在你的 M2 Mac 上）
```bash
# 1) 生成 iOS 原生工程（ios/ 已存在，会按 app.json 配置刷新）
npx expo prebuild -p ios

# 2) 装 Pod
cd ios && pod install && cd ..

# 3) 跑到 iPhone（或 Xcode 打开 ios/PostureAI.xcworkspace 选真机运行）
npx expo run:ios --device
```

### 配置（已在本提交补齐）
- `app.json` → `ios.infoPlist` 已加：`NSMotionUsageDescription`（运动）、`NSCameraUsageDescription`（相机）、`NSPhotoLibraryUsageDescription`（相册）。
- `ios.bundleIdentifier = com.catune`（已有）。

### 验收（iPhone 16 Pro）
- [ ] Desk：倾手机 → 黑猫随角度动、点位/三指标实时变、规则教练文案（喵）。
- [ ] 提醒：坐歪触发震动 + 建议动作 chip → 去跟练。
- [ ] Plant：成长植物 + 日报/周报。
- [ ] Monitor：运行日志（传感器/流程实时；模型类会显示"不可用→规则兜底"）。
- [ ] AI 评估：Settings 配「联网评估」+ Key → 拍照/相册评估；或示例。
- [ ] 跨平台卖点：同一套 TS 在 iPhone 与小米14 上一致。

> 工作量：约 半天~1 天（构建链路 + 权限调试）。**iOS 无端侧 LLM**，演示口径：「端侧 Qwen+MNN 主线在安卓真机；iOS 同一套 TS 跑 UI/云端/规则，端侧桥复赛补」。

---

## 3. 目标 B：iOS 端侧 Qwen+MNN（复赛）

C++ 核可复用，主要是「编 MNN iOS 库 + 写 ObjC++ 桥」。骨架已放 `ios/CatuneMnn/`（见 §4）。

### 步骤
1. **编 MNN iOS**：MNN 源码 `cmake` 出 iOS arm64（device+sim）静态库/framework，带 `MNN_BUILD_LLM` + KleidiAI；或用 MNN 官方 iOS 构建脚本。
2. **加 C++ 核到 Xcode 工程**：把 `eyes_llm_session.{h,cpp}`、`llm_stream_buffer.hpp`、`utf8_stream_processor.hpp`（与安卓共享同一份）加入 iOS target（建议软链或 Podspec 引用，避免两份拷贝）。
3. **ObjC++ 桥 `CatuneMnn.mm`**（骨架已给）：实现 `RCTBridgeModule`，方法名与安卓一致（`getStatus/inferText/inferTextStream/analyzeImage/runBenchmark`），内部直接调 `eyes::EyesLlmSession`。流式用 `RCTEventEmitter` 发 `onMnnToken/onMnnDone/onMnnError`（与安卓事件名一致，JS 侧 `inferStreamClient` 零改动）。
4. **Podfile / 链接**：链接 libMNN.framework + 设置 `CLANG_CXX_LANGUAGE_STANDARD=c++17`、把模型放 `Documents/mnn_models/`（`expo-file-system` 的 documentDirectory，与安卓 filesDir 对齐）。
5. **真机验证**：A18 Pro 跑 Qwen2.5-0.5B，看中文输出 + TPS（NEON/SME，非 SME2）。

> 工作量：约 3~5 天（编库+桥+联调；C++ 复用省大头）。

---

## 4. iOS 桥骨架（`ios/CatuneMnn/`）

- `CatuneMnn.h` / `CatuneMnn.mm`：RN 原生模块骨架，方法签名与安卓 `MnnDebugModule` 对齐，含 TODO 标注待接 `eyes::EyesLlmSession`。
- **未接入构建**（不影响目标 A）：这些文件需在 `expo prebuild` 后手动加入 Xcode target（或写成 Expo config plugin / 本地 Pod）才参与编译。目标 A 的 iPhone 包**不需要**它们。

集成顺序：先跑通目标 A → 复赛再把 §3 的库与桥接进 Xcode target。

---

## 5. 给评审的口径
- **跨平台**：业务/UI 一套 TS，iOS（iPhone 16 Pro）+ Android（小米14）+ Web 通用，构建真原生 App。
- **端侧 AI**：核心端侧 Qwen+MNN 推理在 **Android 真机**（含 SME2 编译开关）；iOS 端侧桥代码骨架就绪、C++ 核共享，复赛接通。
- **SME2**：考核点以 Android 口径为准（编译开关已开）；iPhone A18 Pro 无 SME2，仅作 UI/跨平台演示。
