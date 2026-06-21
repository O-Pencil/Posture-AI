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

## 3. 目标 B：iOS 端侧 Qwen+MNN（代码已写完，待你 Mac 上编 MNN + 真机验证）

**已实现**（复用安卓 C++ 核，只换桥层）：
- `ios/CatuneMnn/CatuneMnn.{h,mm}` —— **完整** ObjC++ RN 模块，方法/事件名与安卓 `MnnDebugModule` 完全一致：`getStatus / inferText / inferTextStream / analyzeImage / runBenchmark / releaseModel`，内部直接调 `eyes::EyesLlmSession`；流式用 `RCTEventEmitter` 发 `onMnnToken/onMnnDone/onMnnError`，串行队列保证不并发，轮询 `getPartial()` 出 token。**JS 侧零改动**。
- `ios/CatuneMnn/CatuneMnn.podspec` —— 编本模块 + 共享 C++ 核（排除 JNI 专属 `eyes_mnn_bridge.cpp`）+ 链接 MNN 静态库，C++17。
- `android/.../cpp/eyes_log.h` —— 已改**跨平台**（Android logcat / iOS stderr），C++ 核 iOS 可编。
- `plugins/withCatuneMnn.js` —— Expo config plugin：prebuild 时把 Pod 加进 Podfile；**守卫**：仅当 `ios/CatuneMnn/MNN/lib/libMNN.a` 存在才启用 → **目标 A（无端侧）的 prebuild 不受影响**。已挂到 `app.json`。
- `scripts/build-mnn-ios.sh` —— 编 MNN iOS 静态库 + 汇总头文件到 `ios/CatuneMnn/MNN/`。

**你只剩两件（Mac 上）**：
```bash
# 1) 编 MNN iOS 库（产出 ios/CatuneMnn/MNN/lib/libMNN.a + include/）
export MNN_SRC=$PWD/android/app/src/main/cpp/third_party/MNN
bash scripts/build-mnn-ios.sh

# 2) prebuild + 装 Pod + 真机跑（plugin 检测到 libMNN.a 自动接通端侧）
npx expo prebuild -p ios && cd ios && pod install && cd ..
npx expo run:ios --device
```
3) App 内下载模型（`Documents/mnn_models/qwen2.5-0.5b/`，`expo-file-system` 与安卓对齐）→ Settings 基准测试看中文输出 + TPS。

> 注意点（按 MNN 版本可能要微调）：
> - **cmake 开关已对齐安卓已验证的 libMNN 配置**：`MNN_BUILD_LLM / MNN_KLEIDIAI / MNN_SME2 / MNN_ARM82 / MNN_LOW_MEMORY / MNN_CPU_WEIGHT_DEQUANT_GEMM`（+ iOS 专属 `SHARED_LIBS=OFF / SEP_BUILD=OFF / AAPL_FMWK=OFF / METAL=OFF`）。
> - **头文件不拷贝**：podspec 的 `HEADER_SEARCH_PATHS` 直接指向 `third_party/MNN` 的 4 个目录（`include`、`transformers/llm/engine/include`、`tools/audio/include`、`3rd_party`），与安卓 `cpp/CMakeLists.txt` 完全一致。MNN 源码用与安卓**同一份**（本地 `third_party/MNN`，gitignore 不入库）。
> - 若 `MNN_SME2/MNN_KLEIDIAI` 在 Apple clang 上报错：**可去掉**——A18 Pro 无 SME2，端侧仍可跑、只少 SME2 内核（不影响功能）。
> - 脚本默认只编 **device arm64**；要同时跑模拟器需 xcframework（device+sim）。
> - A18 Pro **有 SME、无 SME2** → iOS 端侧走 NEON/SME，不是 SME2（SME2 考核点用安卓口径）。
> - 这套原生**无法在本仓库 CI/Linux 编译验证**，首次真机构建大概率要按报错小修（MNN 头路径/符号）。

> 工作量：编 MNN iOS + 真机联调约 1~2 天（代码已写完，省了写桥的时间）。

---

## 4. 文件清单（`ios/CatuneMnn/` 等）

| 文件 | 作用 |
| --- | --- |
| `ios/CatuneMnn/CatuneMnn.h` / `.mm` | iOS RN 原生模块（完整实现） |
| `ios/CatuneMnn/CatuneMnn.podspec` | 编模块 + 共享 C++ 核 + 链接 MNN |
| `plugins/withCatuneMnn.js` | Expo 插件，按需把 Pod 加进 Podfile（无 MNN 库则跳过） |
| `scripts/build-mnn-ios.sh` | 编 MNN iOS 库 + 汇总头 |
| `android/.../cpp/*`（共享） | C++ 推理核，Android/iOS 同一份（`eyes_log.h` 已跨平台） |

---

## 5. 给评审的口径
- **跨平台**：业务/UI 一套 TS，iOS（iPhone 16 Pro）+ Android（小米14）+ Web 通用，构建真原生 App。
- **端侧 AI**：核心端侧 Qwen+MNN 推理在 **Android 真机**（含 SME2 编译开关）；iOS 端侧桥代码骨架就绪、C++ 核共享，复赛接通。
- **SME2**：考核点以 Android 口径为准（编译开关已开）；iPhone A18 Pro 无 SME2，仅作 UI/跨平台演示。
