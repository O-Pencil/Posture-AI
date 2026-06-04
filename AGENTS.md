# Posture-AI · AGENTS.md

> 项目代号：**Posture-AI**（赛事名 *Omni-Posture Master*，包名 `com.postureai`）
> 类型：React Native 0.76 + Android 原生（Kotlin / C++ JNI）混合应用
> 文档协议：DIP（Dual-phase Isomorphic Documentation）· P1 根地图
> 文档语言：**中文**

---

## 1. Identity（项目本质）

Posture-AI 是一款**端侧优先、隐私优先**的智能体应用，把"高频 IMU 脊柱动捕 + 端侧多模态大模型（Qwen3-VL via MNN）"打包成 MCP 工具，暴露给 PC 上的 LLM 智能体（Claude Code、Qwen、Codex 等）远程调用。

- 核心目标：实时检测久坐人群的脊柱姿态（颈椎前倾 NECK PITCH、腰椎侧倾 LUMBAR ROLL），并在异常时通过振动反馈 + 端侧 VL 推理给出自然语言干预。
- 关键约束：**端侧推理**为主，云端只在必要时走 Qwen-VL API；MCP HTTP 服务内嵌在 App 进程内，与 RN UI 共用生命周期。
- 用户场景：TONGYI LAB × Arm 手机端挑战赛初赛（2026-06-22）演示 + 2 人小团队 2 周冲刺。

---

## 2. 架构拓扑（ASCII）

```
                ┌──────────────────────────────────────────┐
                │       PC 端 LLM 智能体 (Claude Code)      │
                │  stdio MCP / SSE ←──────────┐             │
                └─────────────────────────────┼─────────────┘
                                              │ HTTPS 8765
                                              │ (LAN Bearer Token)
┌─────────────────────────────────────────────┴─────────────────────────────────────┐
│                              Android 进程 (com.postureai)                          │
│                                                                                    │
│  ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────────────┐ │
│  │  React Native UI   │   │   MCP HTTP Server  │   │  Watchdog 周期感知 + 告警   │ │
│  │  App.tsx 仪表盘    │◀─▶│  Ktor + CIO        │   │  WatchdogManager /         │ │
│  │  index.js 入口     │   │  Bearer Auth       │   │  PendingAlertStore         │ │
│  │  __tests__ 快照    │   │  SSE /mcp stream   │   └────────────────────────────┘ │
│  │  NativeEventEmitter│   └─────────┬──────────┘                                   │
│  └──────────┬─────────┘             │                                              │
│             │ RN Bridge             │ JsonRpcRequest                                │
│             ▼                       ▼                                              │
│  ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────────────┐ │
│  │  KinematicsModule  │   │  McpRequestHandler │   │  DefaultPerceptionEngine   │ │
│  │  (RN 桥接)         │   │  路由工具调用       │──▶│  LOOK / LISTEN / PERCEIVE  │ │
│  └──────────┬─────────┘   └──────────┬─────────┘   └─────────────┬──────────────┘ │
│             │                        │                            │                │
│             ▼                        ▼                            ▼                │
│  ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────────────┐ │
│  │  KinematicsHub     │   │  McpToolRegistry   │   │  MnnPerceptionEngine  ◀─┐  │ │
│  │  (StateFlow)       │   │  10 个 MCP 工具    │   │  JNI → libMNN + bridge   │  │ │
│  │  neck/lumbar/posture│  └────────────────────┘   │  Qwen3-VL 2B 端侧推理     │  │ │
│  └──────────┬─────────┘                            │  ModelOutputParser 解析JSON│ │
│             │                                      └────────────────────────────┘ │
│             ▼                                                                   │
│  ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────────────┐ │
│  │  SpineBluetooth    │   │  CameraCapture     │   │  AudioCapture (16kHz)      │ │
│  │  Manager (BLE)     │   │  Manager (CameraX) │   │  10s 环形 PCM buffer       │ │
│  │  PoseMaster-C6     │   │  bindToLifecycle   │   │  sliceRecentPcm()          │ │
│  └────────────────────┘   └────────────────────┘   └────────────────────────────┘ │
│                                                                                    │
│  ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────────────┐ │
│  │  McpForeground     │   │  PairingManager    │   │  UI 面板 (Compose)          │ │
│  │  Service (前台)    │   │  token / port 8765 │   │  InferenceStatusPanel      │ │
│  │  ServiceRuntime    │   │  SharedPreferences │   │  SpineVisualizer (WebView) │ │
│  └────────────────────┘   └────────────────────┘   └────────────────────────────┘ │
│                                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │  C++ / JNI 桥接 (android/app/src/main/cpp)                                   │ │
│  │   eyes_mnn_bridge.cpp ─→ EyesLlmSession ─→ MNN Llm                          │ │
│  │   LlmStreamBuffer + Utf8StreamProcessor 处理流式 UTF-8 输出                 │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 目录结构（与 `ls -la` 对齐）

```
Posture-AI/
├── App.tsx                       # RN 入口组件，仪表盘 + F7 Mock Console
├── index.js                      # AppRegistry 绑定
├── app.json                      # RN 应用元数据（name=Posture-AI）
├── package.json                  # 依赖（RN 0.76、react 18.3.1）
├── tsconfig.json                 # 继承 @react-native/typescript-config
├── babel.config.js               # @react-native/babel-preset
├── metro.config.js               # 默认 Metro 配置
├── jest.config.js                # react-native preset
├── .eslintrc.js / .prettierrc.js # 代码风格
├── Gemfile                       # cocoapods 锁定版本
├── __tests__/                    # RN 渲染快照测试
├── android/                      # 原生 Android 主体
│   ├── build.gradle              # 根 build 脚本
│   ├── settings.gradle           # 包含 :app 子工程
│   ├── gradle.properties         # Hermes + New Arch
│   └── app/
│       ├── build.gradle          # com.postureai 应用配置
│       ├── proguard-rules.pro
│       └── src/main/
│           ├── AndroidManifest.xml    # 权限 + ForegroundService
│           ├── java/com/postureai/    # Kotlin 源码（13 个子包）
│           ├── cpp/                  # C++/JNI 桥接
│           ├── jniLibs/arm64-v8a/     # libMNN.so
│           └── res/                   # 图标 + strings + styles
├── ios/                          # 标准 RN iOS 脚手架（未启用原生模块）
│   ├── Podfile
│   ├── PostureAI/                # AppDelegate / Info.plist / PrivacyInfo
│   └── PostureAITests/           # RN 内置测试
├── PRD/
│   ├── AI姿态矫正康复产品PRD.md  # v1.9 完整产品需求
│   └── 技术规格文档.md            # 硬件 / 数据协议 / AI 安全 / 研发模块拆分
├── docs/
│   ├── 技术草案.md               # 软硬件结合技术方案
│   └── README-Native.md          # Android 构建/首次运行指南
├── README.md                     # 项目英文总览
├── README-RN.md                  # RN 脚手架英文说明
└── AGENTS.md                     # P1 根地图（CLAUDE.md 是其软链，供 Claude Code 自动加载）
```

---

## 4. 关键抽象（≤ 7 个）

| 抽象 | 位置 | 职责 |
| --- | --- | --- |
| `KinematicsHub` | `android/.../inference/mnn/KinematicsHub.kt` | 实时姿态状态机（颈前倾/腰椎侧倾/姿势枚举/0-100 分），RN 与 BLE 共用的状态枢纽 |
| `PerceptionEngine` | `android/.../inference/PerceptionEngine.kt` | 多模态 VL 推理接口（`analyze` / `lookRaw` / `analyzeWatchdogFrame`），MCP 工具调用入口 |
| `McpHttpServer` | `android/.../mcp/McpHttpServer.kt` | Ktor CIO 内嵌 HTTP 服务，监听 `0.0.0.0:8765`，Bearer Token 鉴权，POST /mcp + GET SSE 流 |
| `McpToolRegistry` | `android/.../mcp/McpToolRegistry.kt` | 10 个 MCP 工具定义（`phone_look` / `phone_listen` / `phone_perceive` / `phone_watch_*` / `phone_look_raw` / `get_body_kinematics` / `trigger_vibration_feedback` / `phone_status`） |
| `DefaultPerceptionEngine` | `android/.../inference/DefaultPerceptionEngine.kt` | 实际编排：先尝试 MNN 推理，失败回退到 `HeuristicAnalyzer`（无 VL 权重的降级模式） |
| `SpineBluetoothManager` | `android/.../bluetooth/SpineBluetoothManager.kt` | 与 PoseMaster-C6 / Omni-Posture-Spine 传感器 BLE 通讯；当前默认走模拟数据流 |
| `WatchdogManager` | `android/.../watchdog/WatchdogManager.kt` | 周期感知任务调度，5 分钟去重阈值，异常推 SSE 通知 + 落盘 `pending_alerts.json` |

> 抽象 8-10 重要性次之：`PairingManager`（token 持久化）、`McpForegroundService`（保活前台服务）、`ServiceRuntime`（运行时编排）。

---

## 5. 构建与运行

### 5.1 公共前置

- Node ≥ 18、Yarn 或 npm
- Android Studio Ladybug+、Android SDK 35、NDK 26
- iOS 端（仅脚手架，无原生模块）：Xcode 15+、CocoaPods ≥ 1.13、CocoaPods 排除 `1.15.0` / `1.15.1`

### 5.2 启动 RN 仪表盘

```bash
npm install
# 终端 1：Metro
npm start
# 终端 2：Android
npm run android
# 或 iOS（脚手架）
npm run ios
```

### 5.3 启动 MCP 服务

1. 在 App 仪表盘点击 **START MCP SERVICE**（App.tsx 预留按钮），或启动 `McpForegroundService`。
2. 通知中心出现"Eyes-on-Phone MCP"前台通知。
3. 控制台日志/通知打印 `http://<lan-ip>:8765/mcp` 与 `Bearer eop_<uuid>`。
4. PC 端 LLM 智能体（Claude Code / Codex）通过 LAN 调用。

### 5.4 MNN 模型可选加载

若要启用真端侧 VL 推理（而非降级到 HeuristicAnalyzer），把转换好的 Qwen3-VL-2B MNN 权重 push 到：

```bash
adb push <本地模型目录> /data/data/com.postureai/files/mnn_models/qwen3-vl-2b/
# 目录必须包含：config.json, llm.mnn, llm.mnn.weight, visual.mnn, visual.mnn.weight
```

无权重时自动降级为 `degraded_mode: true` + 启发式分析，**MCP 服务仍然可用**。

### 5.5 验证与检查

```bash
# 单元/快照测试
npm test
# 静态检查
npm run lint
# Android 端到端构建
cd android && ./gradlew assembleDebug
```

---

## 6. 核心约定

- **命名**：Kotlin 包 `com.postureai`，C++ 命名空间 `eyes`（来自 "Eyes-on-Phone" 历史代号，保留兼容）。
- **日志**：`EYES_LOG_TAG = "EyesMNN"`（C++），`Tag = "KinematicsModule"` 等（Kotlin，使用类名）。
- **线程**：
  - RN 桥接走 `Dispatchers.Main`
  - MNN 推理走专用单线程 `eyes-mnn-infer` 调度器
  - 音频采集走独立 `Thread`
  - MCP HTTP 走 Ktor CIO 协程
- **状态流**：UI 状态用 `StateFlow`（KinematicsHub、InferenceStatusHub），订阅 RN EventEmitter。
- **数据契约**：`PerceptionResult.toJson()` / `KinematicsHub.getAsJson()` 是 MCP 工具的唯一返回格式。

---

## 7. DIP 导航（双相同构文档）

本项目按 **P1（根地图）/ P2（模块地图）/ P3（文件契约头）** 三层组织文档，每层都通过 `AGENTS.md` 承载：

| 层级 | 文件 | 作用 |
| --- | --- | --- |
| P1 | `AGENTS.md`（本文件） / `CLAUDE.md` | 项目拓扑、技术栈、构建命令、关键抽象 |
| P2 | `android/app/src/main/java/com/postureai/AGENTS.md` | 13 个 Kotlin 子包 + 入口类的成员清单 |
| P2 | `android/app/src/main/cpp/AGENTS.md` | 7 个 C++/CMake 桥接源文件清单 |
| P2 | `ios/AGENTS.md` | iOS RN 脚手架（P3 已加，复赛再启用原生模块） |
| P2 | `__tests__/AGENTS.md` | RN 渲染测试 |
| P3 | 每个源文件顶部的中文注释头 | `[WHO]` 导出 · `[FROM]` 依赖 · `[TO]` 消费方 · `[HERE]` 位置与角色 |

**阅读顺序**：先看 P1（你正在读）→ 按需进入 P2（模块成员清单）→ 在 P2 找到目标文件 → 先看 P3 头部判断是否相关，再决定是否深入读代码。

**维护纪律**：
- 新增/删除/移动任何源文件 → 必须同步更新对应 P2 的成员清单。
- 修改任何模块边界（导入/导出/职责）→ 必须更新对应文件的 P3 头部。
- P1 中的「关键抽象」发生变化（新增/废弃/合并）→ 同步更新 P1。

---

## 8. Commit 规范（中文强制）

所有 commit message **必须使用中文**，并遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <subject>

[optional body]
```

### Type 类型

| Type       | 用途                         |
| ---------- | ---------------------------- |
| `feat`     | 新功能                       |
| `fix`      | 修复 Bug                     |
| `docs`     | 仅文档变更                   |
| `style`    | 代码格式（空格、分号等）     |
| `refactor` | 重构（非 bugfix 也非 feat）  |
| `perf`     | 性能优化                     |
| `test`     | 测试相关                     |
| `chore`    | 构建、工具链、依赖           |
| `ci`       | CI/CD 配置                   |
| `revert`   | 回滚                         |

### 规则

- **语言**：必须中文。禁止英文 commit message。
- **Subject**：祈使句，不加句号，不超过 72 字符。
- **Scope**：可选，小写（如 `android`、`ios`、`rn`、`mcp`、`prd`）。
- **Body**：每行不超过 72 字符，说明 *为什么*，而不是 *做了什么*。

### 示例

```
feat(android): 集成 MNN 推理引擎
fix(prd): 修复文件移动导致的 UTF-8 编码损坏
docs: 添加 commit 规范到 AGENTS.md
chore(android): 更新 Gradle 构建配置
```

> Claude Code 兼容说明：项目根的 `CLAUDE.md` 是本文件的**符号链接**（`CLAUDE.md → AGENTS.md`），Claude Code 会自动加载 `CLAUDE.md`，内容与本文件完全一致，**无需手动同步**。
