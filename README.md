# Catune · Omni-Posture Master

> Android 包名：`com.catune`
> 参赛方向：TONGYI LAB x Arm 手机端挑战赛
> 文档语言：中文

Catune 是一个完整的 React Native Android 手机 App，不是小程序、H5 或纯演示页。它把 IMU 姿态采集、端侧 Qwen + MNN 本地 CPU 推理、Android 原生能力和 RN 仪表盘放在同一个 App 进程内，面向 2026-06-22 初赛交付“不驼背坐姿助手”的可演示闭环。

核心产品诉求来自 [PRD/AI姿态矫正康复产品PRD.md](PRD/AI姿态矫正康复产品PRD.md)：持续检测久坐用户的驼背/头前倾，异常时给出震动和 App 提醒，并串起训练与复盘。最新技术口径以 [docs/技术实现文档.md](docs/技术实现文档.md) 为准。

## 硬性技术口径

- **App 形态**：完整 Android 手机 App，前端 UI 使用 React Native 0.76 + Hermes。
- **端侧推理**：核心姿态分类与本地反馈必须在手机端通过 Qwen + MNN 运行，本地 CPU 推理为主。
- **Arm 加速**：MNN 库需使用支持 Arm SME2 的 arm64 构建；演示时展示 SME2/NEON 能力检测、模型加载状态和推理指标。
- **云端边界**：云端 Qwen-VL/API 只做低频视觉评估、报告润色或兜底辅助，不能替代核心姿态判断。
- **离线能力**：断网后仍能完成姿态分类、分数刷新、提醒文案和 F7 Mock 演示。

## 当前代码状态

| 层 | 当前实现 |
| --- | --- |
| RN UI | [App.tsx](App.tsx) 渲染姿态分数、Neck Pitch、Lumbar Roll、当前状态和 F7 Mock Console |
| RN Bridge | `KinematicsModule` 通过 `NativeEventEmitter` 向 RN 推送 `onKinematicsUpdate` |
| 姿态状态 | `KinematicsHub` 维护 `NORMAL / SLUMPED / TECH_NECK / LEFT_LEAN / OFFLINE` 和 0-100 分 |
| BLE / Mock | `SpineBluetoothManager` 写入姿态流，F7 可切换模拟场景 |
| 端侧推理 | `MnnPerceptionEngine` + `InferenceExecutor` 串行调用 JNI 和 MNN LLM |
| JNI / C++ | `eyes_mnn_bridge.cpp`、`eyes_llm_session.cpp` 链接 `libMNN.so` |
| MCP 服务 | Ktor CIO 内嵌服务，`POST /mcp` + `GET /mcp` SSE，提供 10 个工具 |
| 降级路径 | MNN 权重缺失或推理失败时回退到启发式/规则化结果，主流程不中断 |

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

## MNN 模型放置

初赛主路径要求 Qwen + MNN 本地推理。当前代码默认扫描：

```text
/data/data/com.catune/files/mnn_models/qwen3-vl-2b/
```

目录需包含：

```text
config.json
llm.mnn
llm.mnn.weight
visual.mnn
visual.mnn.weight
```

文档层面的初赛目标模型是 Qwen3.5/Qwen 2B INT4 姿态分类模型；当前代码路径仍沿用 `qwen3-vl-2b` 历史目录名，后续可在不改变推理接口的前提下统一为 `qwen-posture-2b-int4`。

## 文档导航

| 入口 | 用途 |
| --- | --- |
| [docs/技术实现文档.md](docs/技术实现文档.md) | 最新权威技术实现方案，含 PRD 技术评审和代码现状 |
| [docs/硬件采购与小白使用指南.md](docs/硬件采购与小白使用指南.md) | 面向零硬件基础的采购清单、接线、通电和佩戴说明 |
| [PRD/AI姿态矫正康复产品PRD.md](PRD/AI姿态矫正康复产品PRD.md) | 产品需求、演示策略、功能验收 |
| [AGENTS.md](AGENTS.md) | DIP P1 根地图、模块导航和协作规范 |

## 验证命令

```bash
npm test
npm run lint
cd android && ./gradlew assembleDebug
```

比赛演示前还需要补充真机 benchmark：模型加载耗时、首 token、总推理耗时、内存峰值、SME2/NEON 后端状态。
