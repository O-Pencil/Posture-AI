# Catune · Omni-Posture Master

> Android 包名：`com.catune`
> 参赛方向：TONGYI LAB x Arm 手机端挑战赛
> 文档语言：中文

Catune 是一个完整的 React Native Android 手机 App，不是小程序、H5 或纯演示页。它把 IMU 姿态采集、Android 原生能力和 RN 仪表盘放在同一个 App 进程内，面向 2026-06-22 初赛交付“不驼背坐姿助手”的可演示闭环。

> **当前阶段（2026-06-09）**：RN 框架可在 x86_64 模拟器跑起来，仪表盘由本地 10Hz 模拟流驱动，能显示姿态分数/角度/状态，并**根据姿态给出建议文案（规则兜底，离线可用）**。端侧 Qwen + MNN 推理桥代码（C++/JNI + Kotlin）**已恢复进仓库但默认不参与构建、未接真模型**——开发机装不下模型、缺 MNN 源/SME2 库，接入计划见 [docs/端侧模型对接计划.md](docs/端侧模型对接计划.md)。UI 页面按 PRD 后续迭代。

核心产品诉求来自 [PRD/AI姿态矫正康复产品PRD.md](PRD/AI姿态矫正康复产品PRD.md)：持续检测久坐用户的驼背/头前倾，异常时给出震动和 App 提醒，并串起训练与复盘。最新技术口径以 [docs/技术实现文档.md](docs/技术实现文档.md) 为准。

### 仓库内的非 App 产物（不作为最终 APP 输出）

| 目录 | 用途 | 是否打进 App |
| --- | --- | --- |
| `web/` | 设计师快速迭代用的 Vite + React 原型工程 | ❌ 仅设计迭代，不作为最终 APP 输出 |
| `prototype/` | 静态 HTML 视觉/交互原型 | ❌ 仅视觉参考，不作为最终 APP 输出 |

> 最终交付物是 React Native Android App（仓库根 `App.tsx` + `android/`）。`web/` 与 `prototype/` 保留供设计协作，最终 UI 会回到 RN 实现。

## 硬性技术口径（目标态）

- **App 形态**：完整 Android 手机 App，前端 UI 使用 React Native 0.76 + Hermes。✅ 已满足
- **端侧推理**：核心姿态分类与本地反馈在手机端通过 Qwen + MNN 运行，本地 CPU 推理为主。🟡 推理桥代码就绪、默认不编；待模型/SME2 库/真机，见 [docs/端侧模型对接计划.md](docs/端侧模型对接计划.md)
- **Arm 加速**：MNN 库需使用支持 Arm SME2 的 arm64 构建；演示时展示 SME2/NEON 能力检测、模型加载状态和推理指标。🚧 随端侧模型一并接入
- **云端边界**：云端 Qwen-VL/API 只做低频视觉评估、报告润色或兜底辅助，不能替代核心姿态判断。
- **离线能力**：断网后仍能完成姿态分类、分数刷新、提醒文案和 F7 Mock 演示。✅ 规则状态机已离线可用

## 当前代码状态

| 层 | 当前实现 |
| --- | --- |
| RN UI | [App.tsx](App.tsx) 渲染姿态分数、Neck Pitch、Lumbar Roll、当前状态、**建议文案**和 F7 Mock Console（测试数据） |
| 姿态文案 | `PostureClassifier` 经 `KinematicsModule` 透传 `advice`；当前走规则兜底（离线可用），模型就绪后切端侧 |
| RN Bridge | `KinematicsModule` 通过 `NativeEventEmitter` 向 RN 推送 `onKinematicsUpdate` |
| 姿态状态 | `KinematicsHub` 维护 `NORMAL / SLUMPED / TECH_NECK / LEFT_LEAN / OFFLINE` 和 0-100 分 |
| 数据源 | `SpineBluetoothManager` 自动启动 10Hz 模拟流写入姿态状态；F7 可切换模拟场景 |
| 角度解算 | `MainActivity.calculateSpineAnglesStatic` 纯 Kotlin 占位实现（待接真实算法） |
| 端侧推理 | 🟡 C++/JNI 桥 + Kotlin 推理桥 + `libMNN.so` **已恢复进仓库但默认不编、未接线**；`-PenableMnn` 才挂 CMake。仍缺 MNN 源码 / SME2 库 / 模型，见 [docs/端侧模型对接计划.md](docs/端侧模型对接计划.md) |

> 默认 `assembleDebug` 是纯 RN + Kotlin（不挂 CMake，模拟器可装）。端侧推理用 `-PenableMnn=true` 开启（需先放 MNN 源码到 `cpp/third_party/MNN/`）。
>
> 已移除（PRD §0.5.7 Non-Goals）：MCP/Ktor 服务、CameraX/音频采集、Watchdog、Compose 调试面板、`DefaultPerceptionEngine`/`HeuristicAnalyzer`；可从 git `d17af44` 恢复。

## 快速开始

```bash
npm install
npm start
```

另开一个终端运行 Android：

```bash
npm run android
```

Android 原生构建：

```bash
cd android
./gradlew assembleDebug
```

## 端侧模型

端侧 Qwen + MNN 的推理桥代码（C++/JNI + Kotlin）已在仓库，但默认不参与构建、未接入 RN 主链路；仓库不含模型权重与 SME2 版 libMNN。接入步骤、目录约定、`-PenableMnn` 开关、验收标准统一收敛到 [docs/端侧模型对接计划.md](docs/端侧模型对接计划.md)。

## 文档导航

| 入口 | 用途 |
| --- | --- |
| [docs/技术实现文档.md](docs/技术实现文档.md) | 最新权威技术实现方案，含 PRD 技术评审和代码现状 |
| [docs/端侧模型对接计划.md](docs/端侧模型对接计划.md) | 端侧 Qwen + MNN 重新接入的分步计划与验收 |
| [docs/硬件采购与小白使用指南.md](docs/硬件采购与小白使用指南.md) | 面向零硬件基础的采购清单、接线、通电和佩戴说明 |
| [PRD/AI姿态矫正康复产品PRD.md](PRD/AI姿态矫正康复产品PRD.md) | 产品需求、演示策略、功能验收 |
| [AGENTS.md](AGENTS.md) | DIP P1 根地图、模块导航和协作规范 |

## 验证命令

```bash
npm test
npm run lint
cd android && ./gradlew assembleDebug                 # 默认：纯 RN + Kotlin（不挂 CMake，模拟器可装）
cd android && ./gradlew assembleDebug -PenableMnn=true # 端侧推理：编 arm64 native（需先放 MNN 源码到 cpp/third_party/MNN/）
```
