# Catune · AGENTS.md

> 项目代号：**Catune**（赛事名 *Omni-Posture Master*，包名 `com.catune`）
> 类型：**统一 Expo SDK 54 / RN 0.81 App（iOS + Android + Web，一套 TS）**；手机 IMU 已通，端侧 AI 主线下沉到安卓原生
> 文档协议：DIP（Dual-phase Isomorphic Documentation）· P1 根地图
> 文档语言：**中文**

---

## 1. Identity（项目本质）

Catune 是面向久坐用户的「不驼背坐姿助手」**React Native 跨平台手机 App**（iOS + Android，构建出真原生 App，非小程序/H5/网页壳）。

- 核心目标：检测久坐人群的驼背/头前倾（颈前倾 NECK PITCH、腰椎侧倾 LUMBAR ROLL），异常时震动 + App 提醒，并串起训练与复盘闭环。
- 用户场景：TONGYI LAB × Arm 手机端挑战赛（2026-06-22）演示 + 2 人小团队冲刺。
- **架构原则**：业务逻辑（状态机/打分/建议/模拟数据）用 **TS 写一次**（`src/posture/`，iOS/Android 通用）；只有「端侧 Qwen+MNN 推理」「真蓝牙」下沉原生。
- **当前阶段（2026-06-14）**：RN/RNW 基础 UI 已迁移到 `src/ui/`（Desk / Plant / Settings）；iPhone via Expo Go 的 DeviceMotion 真数据已通，单手机 IMU 临时映射为颈/胸/腰三路演示值；本地 10Hz mock 仍作为兜底。硬件 3 节点链路等待杜邦线到货后接 ESP32-S3 + BNO085/BNO086。
- **端侧 Qwen + MNN 推理**：C++ 核心 + Android JNI 桥 + `libMNN.so` + `CatuneMnn` RN 模块在仓库但**模型 native 默认不编**（`-PenableMnn` 才挂 CMake，仅 arm64）；Settings 已有 MNN Debug 卡片，下一步用 Android arm64 真机推模型验证 `inferText()`。iOS 侧本地模型桥待写，不作为当前比赛主线。详见 [docs/端侧模型对接计划.md](docs/端侧模型对接计划.md)。
- **SME2 加速**：Arm CPU 特性、只能原生实现，演示建议在**安卓 Arm 真机**上做。
- **已移除（PRD §0.5.7 Non-Goals）**：MCP/Ktor、CameraX/音频、Watchdog、Compose 面板、PairingManager、`DefaultPerceptionEngine`/`HeuristicAnalyzer`；业务逻辑迁 TS 后又删除了 Kotlin 的 `KinematicsHub`/`KinematicsModule`/`SpineBluetoothManager`/`posture/*`（逻辑单一来源在 TS）。

---

## 2. 架构拓扑（ASCII）

业务逻辑全在 TS（iOS/Android 通用）；原生只做引导 + 未来的端侧 AI。

```
┌───────────────────────────────────────────────────────────────┐
│  TypeScript 层（iOS + Android 通用，src/posture/ + App.tsx）   │
│                                                               │
│   mock.ts / sensorSource.ts ─► engine.ts (createPostureEngine)│
│   (F7模拟 / 手机IMU)       ├─ 规则状态机 + 0-100 分            │
│                         ├─ ruleFallback：建议查表 + 禁词       │
│                         └─ subscribe ──► App.tsx 仪表盘渲染    │
│                                            (分数/角度/状态/建议)│
└───────────────────────────────┬───────────────────────────────┘
                                 │ 仅「端侧 AI / 真蓝牙」才下沉原生
            ┌────────────────────┴─────────────────────┐
            ▼ (Android, 默认不编)            ▼ (iOS, 待写薄桥)
   CatuneMnn.inferText                ObjC++ 桥待写（非当前主线）
   → JNI → eyes_llm_session.cpp ──────► libMNN ─► Qwen 2B INT4 (SME2)
   原生引导：CatuneApp / MainActivity / CatunePackage（仅启动 RN）
```

> 接线方式（见 docs/端侧模型对接计划.md）：TS 文案生成外围调用 `CatuneMnn.inferText(prompt)`，失败回退 `ruleFallback`。

### 2.1 多路径数据流

```
(A) 实时姿态主路径（iOS/Android 通用）
  mock.ts (10Hz)  ─┐
  sensorSource ────┴──► engine.update(n,t,l) ──► DashboardState ──► App.tsx 仪表盘
                  └─► src/platform/*        └─►  PlantScreen 成长
                                              └─► src/platform/dailyHistory 持久化

(B) 端侧 AI 建议路径（异步、流式，不被 update 覆盖）
  src/mnn/inferStreamClient
       ↓ chunks
  src/posture/adviceOrchestrator
       ↓ setModelAdvice(text, 'qwen-local')
  engine (内部粘性字段，10Hz 帧不覆盖)
       ↓ subscribe
  App.tsx 仪表盘 → 替换 ruleFallback 文案

(C) 视觉评估路径（云端 / 端侧 / 兜底）
  AssessScreen (拍照)
       ↓
  assess/service.run(image)
       ↓ 选后端
  cloudClient  OR  localVlClient
       ↓
  parse → AssessmentResult
       ↓ 失败回退
  preset.pickPreset() (3 套预置)
       ↓
  AssessResult 组件

(D) 训练与复盘路径
  DeskScreen 异常 → TrainingScreen (exercises.ts 例程) → 回到 DeskScreen
  PlantScreen → DailyReportPanel / WeeklyReportPanel（dailyReport.ts）
```---

## 3. 目录结构（与 `ls -la` 对齐）

```
Catune/
├── App.tsx                       # RN 入口组件，持有 engine + 传感器/模拟数据源
├── index.js                      # AppRegistry 绑定
├── app.json                      # RN 应用元数据（name=Catune）
├── package.json                  # 依赖（Expo SDK 54 / RN 0.81 / react 19 / react-native-web）
├── tsconfig.json                 # 继承 @react-native/typescript-config
├── babel.config.js               # @react-native/babel-preset
├── metro.config.js               # 默认 Metro 配置
├── jest.config.js                # react-native preset
├── .eslintrc.js / .prettierrc.js # 代码风格
├── Gemfile                       # cocoapods 锁定版本
├── __tests__/                    # RN 渲染冒烟测试（App.test.tsx）
├── src/posture/                  # ★ 纯 TS 核心（跨平台，iOS/Android/Web 通用，零 react-native/expo 依赖）
│   ├── types.ts                  #   数据契约
│   ├── engine.ts                 #   规则状态机 + 打分 + 建议查表 + 禁词 + ruleFallback
│   ├── mock.ts                   #   10Hz 模拟数据源 + F7 场景锁定
│   ├── utils.ts                  #   共享工具函数（clamp / pad / ABNORMAL_POSTURES）
│   ├── actionTag.ts              #   动作标签解析（模型输出 [动作:xxx]）
│   ├── adviceOrchestrator.ts     #   端侧模型建议异步编排（流式写回引擎）
│   ├── coachPrompt.ts            #   教练 prompt 构造（含语义记忆注入）
│   ├── exercises.ts              #   训练动作例程表
│   ├── growth.ts                 #   植物成长累加器
│   └── dailyReport.ts            #   日报/周报构建（规则兜底）
├── src/platform/                 # ★ 平台适配层（仅在本机有意义的依赖：Vibration / FileSystem / DeviceMotion）
│   ├── reminder.ts               #   异常坐姿震动（react-native.Vibration）
│   ├── sensorSource.ts           #   手机 IMU 数据源（expo-sensors DeviceMotion，iPhone 已通）
│   ├── dailyHistory.ts           #   每日快照持久化（expo-file-system）
│   └── memory/                   #   语义记忆持久化 + 检索 + 类型
│       ├── store.ts              #     FileSystem 读写
│       ├── service.ts            #     业务 API（remember / list / forget / inject / locale）
│       ├── scoring.ts            #     记忆打分（重要性 + 过期）
│       └── types.ts              #     数据契约
├── src/mnn/                      # ★ 端侧模型管理（TS，iOS/Android 通用）
│   ├── modelCatalog.ts           #   模型清单（0.5B / 1.7B 定义、标签、下载地址）
│   ├── modelDownloadService.ts   #   全局下载服务（续传 / 暂停 / 进度）
│   ├── modelStorage.ts           #   模型文件存储工具
│   ├── deviceProfile.ts          #   设备探测 + 分级 + 模型推荐（RAM/SME2/存储）
│   └── inferStreamClient.ts      #   端侧推理流式客户端
├── src/assess/                    # ★ 体态视觉评估（TS，含云端/端侧两套客户端）
│   ├── types.ts                  #   评估数据契约（AssessBackend / AssessConfig）
│   ├── config.ts                 #   评估配置持久化
│   ├── preset.ts                 #   3 套预置评估结果（降级兜底）
│   ├── parse.ts                  #   云端 VL 输出解析
│   ├── cloudClient.ts            #   云端 Qwen-VL 评估客户端
│   ├── localVlClient.ts          #   端侧 VL 评估客户端（原生桥）
│   ├── service.ts                #   评估编排（选择后端 → 调用 → 解析 → 兜底）
│   └── readiness.ts              #   评估就绪检查（Key / 依赖 / 设备）
├── src/ui/                       # RN UI 组件（TS，iOS/Android 通用）
│   ├── AppShell.tsx              #   App 外壳（Tab 导航）
│   ├── screens/                  #   页面组件（Desk / Plant / Settings）
│   ├── components/               #   通用组件
│   └── theme/                    #   Haptic 设计系统
├── android/                      # Android 原生（引导 RN + 端侧 AI 支线）
│   ├── build.gradle              # 根 build 脚本
│   ├── settings.gradle           # 包含 :app 子工程
│   ├── gradle.properties         # Hermes + New Arch
│   └── app/
│       ├── build.gradle          # com.catune 应用配置
│       ├── proguard-rules.pro
│       └── src/main/
│           ├── AndroidManifest.xml    # 权限（BLE/INTERNET）+ MainActivity
│           ├── java/com/catune/      # Kotlin 源码（见下）
│           ├── cpp/                   # C++/JNI MNN 桥（默认不编，-PenableMnn 才挂 CMake）
│           ├── jniLibs/arm64-v8a/     # libMNN.so（arm64，可能需换 SME2 版）
│           └── res/                   # 图标 + strings + styles
├── web/                          # 设计师快速迭代用 Vite+React 原型（不作为最终 APP 输出）
├── prototype/                    # 静态 HTML 视觉/交互原型（不作为最终 APP 输出）
├── ios/                          # RN iOS 脚手架（纯 TS 版可跑；端侧 AI 的 ObjC++ 桥待写）
├── PRD/
│   └── AI姿态矫正康复产品PRD.md  # 唯一 PRD：产品需求 / 功能 / 验收
├── docs/
│   ├── 技术实现文档.md            # 唯一技术实现：架构 / 数据 / 安全 / 构建
│   ├── 端侧模型对接计划.md        # 端侧 Qwen+MNN 重新接入的分步计划与验收
│   ├── SME2端侧大模型实战演练计划.md # 从 MNN 源码编译到真机命令行验证再接回 App 的实操计划
│   ├── 硬件采购与小白使用指南.md  # 唯一硬件指南：采购 / 接线 / 通电 / 佩戴
│   └── 设计-IDEA.md               # 设计 IDEA · Haptic 拟物化（Figma Make 提示词）
├── README.md                     # 项目总览与唯一入口
└── AGENTS.md                     # P1 根地图（CLAUDE.md 是其软链，供 Claude Code 自动加载）
```

### Kotlin 源码（`android/app/src/main/java/com/catune/`）— 已瘦身为「引导 RN + 端侧 AI 支线」

```
com/catune/
├── MainApplication.kt             # Application：仅初始化 RN/SoLoader（无业务逻辑）
├── MainActivity.kt               # RN 宿主（getMainComponentName="main"，Expo 默认）
├── rn/
│   ├── CatunePackage.kt          # 注册 CatuneMnn 调试模块
│   └── MnnDebugModule.kt         # RN 调试模块：getStatus / inferText
└── inference/                    # 端侧 AI 支线（模型 native 默认不编、待真机模型）
    ├── PerceptionModels.kt       #   推理数据契约（@Serializable，VL 形态）
    └── mnn/
        ├── MnnPerceptionEngine.kt #   端侧 MNN Kotlin/JNI 桥（analyze + inferText）
        ├── InferenceExecutor.kt  #   单线程串行加载/推理
        └── ModelOutputParser.kt  #   MNN 输出 JSON 解析
```

> 业务逻辑（状态机/判定/建议/模拟流）已迁到 TS（`src/posture/`）；原 `KinematicsHub`/`KinematicsModule`/`SpineBluetoothManager` + Kotlin `posture/*` 已删，逻辑单一来源在 TS。

---

## 4. 关键抽象（≤ 8 个）

| 抽象 | 位置 | 职责 |
| --- | --- | --- |
| `createPostureEngine` | `src/posture/engine.ts` | **（核心）** TS 规则状态机 + 0-100 分 + 建议查表 + 禁词 + `ruleFallback`；observer 订阅。iOS/Android 通用 |
| `createMockSource` | `src/posture/mock.ts` | 10Hz 模拟数据源；F7 锁定场景（修了原 Kotlin「设置被随机流覆盖」的 bug） |
| `createSensorSource` | `src/platform/sensorSource.ts` | 通过 `expo-sensors` 读取 DeviceMotion；iPhone 已可用，单手机 IMU 映射 3 路演示角度 |
| `App` | `App.tsx` | RN 仪表盘：订阅 engine，渲染分数/角度/状态/建议 + F7 Mock Console |
| `deviceProfile` / `recommendModel` | `src/mnn/deviceProfile.ts` | **设备自适应**：探测 RAM/SME2/存储，分级（入门/主流/高性能），推荐 0.5B 或 1.7B |
| `modelDownloadService` | `src/mnn/modelDownloadService.ts` | 全局模型下载服务：续传 / 暂停 / 进度回调；进程重启自动恢复 |
| `MnnPerceptionEngine` | `android/.../inference/mnn/MnnPerceptionEngine.kt` | 端侧 MNN Kotlin/JNI 桥（`analyze`/`inferText` + 指标）。**已恢复·未接线**，`-PenableMnn` 才编 native |
| `MnnDebugModule` | `android/.../rn/MnnDebugModule.kt` | RN 原生调试入口 `CatuneMnn.getStatus()` / `inferText()`；用于 Settings Debug 卡片 |

> C++ 层（`cpp/eyes_mnn_bridge.cpp` → `eyes_llm_session.cpp` → libMNN）含 SME2/NEON 检测与 ttft/tps 指标，iOS 可复用同一份 C++；接入见 [docs/端侧模型对接计划.md](docs/端侧模型对接计划.md)。

---

## 5. 构建与运行

### 5.1 公共前置

- Node ≥ 18、Yarn 或 npm
- 安卓：Android Studio + SDK 35（默认构建**不需要** NDK/CMake；仅 `-PenableMnn` 端侧推理需要 NDK 27 + MNN 源码）
- iOS：Xcode 15+（需 Mac）；或用 Expo Go 在 iPhone 上预览纯 TS 版（免 Mac）

### 5.2 启动 RN 仪表盘（iOS / Android）

```bash
npm install
npm start              # 终端 1：Metro
npm run android        # 终端 2：x86_64 模拟器或真机
npm run ios            # 或 iOS 模拟器（需 Mac + Xcode）
```

启动后仪表盘优先由 `src/posture/sensorSource.ts` 的手机 IMU 驱动；不可用时回退 10Hz 模拟流。iPhone via Expo Go 已可读取 DeviceMotion 真数据；F7 Mock Console 一键切 `NORMAL/SLUMPED/TECH_NECK/LEFT_LEAN/OFFLINE`。

### 5.3 端侧模型（默认关闭）

推理桥代码已在仓库，Android RN 模块 `CatuneMnn` 已注册；默认构建不挂 CMake，模型 native 能力需 `-PenableMnn` + MNN 源码 + 模型，详见 [docs/端侧模型对接计划.md](docs/端侧模型对接计划.md)：

```bash
# 1) 把 MNN 源码放到 android/app/src/main/cpp/third_party/MNN/
# 2) 仅 arm64 真机/AVD：
cd android && ./gradlew assembleDebug -PenableMnn=true
```

### 5.4 验证与检查

```bash
npm test                                # jest 渲染冒烟测试（已通过）
npm run lint                            # eslint（src/ 与 App.tsx 0 error）
npx tsc --noEmit ...                    # TS 类型检查（App.tsx + src/posture/* 已通过）
cd android && ./gradlew assembleDebug   # 默认：纯 RN + 引导 Kotlin（不挂 CMake，模拟器可装）
```

> TS 层（逻辑/UI）可在本机用 jest/tsc 验证；Android/iOS 整包构建需对应 SDK（gradlew / Xcode）。

---

## 6. 核心约定

- **职责边界**：业务逻辑/UI 写在 **TS**（`src/posture/` + `App.tsx`，iOS/Android 单一来源）；原生只做引导 + 端侧 AI/蓝牙。
- **手机 IMU 边界**：iPhone/Android 的 DeviceMotion 是硬件到货前的临时真实数据源；单手机无法物理分离颈/胸/腰三节点，真实姿态带仍需 BLE 硬件。
- **命名**：Kotlin 包 `com.catune`，目录 `java/com/catune/` 已与包名对齐。
- **状态流**：TS 用 `createPostureEngine` 的 observer（`subscribe`）；React 端 `useState` + `useEffect` 订阅。
- **数据源**：当前优先 `src/posture/sensorSource.ts` 手机 IMU，失败回退 `src/posture/mock.ts`；真实蓝牙建议用 `react-native-ble-plx`（TS，两端通用）替换。
- **回退纪律（PRD §5.10）**：分类/打分用规则（可靠底线）；端侧模型只补「文案生成」，失败回退 `ruleFallback`；文案必过禁词。

---

## 7. DIP 导航（双相同构文档）

本项目按 **P1（根地图）/ P3（文件契约头）** 组织文档（精简后已无 P2 模块地图）：

| 层级 | 文件 | 作用 |
| --- | --- | --- |
| P1 | `AGENTS.md`（本文件） / `CLAUDE.md` | 项目拓扑、技术栈、构建命令、关键抽象 |
| P2 | `ios/AGENTS.md` | iOS RN 脚手架（未启用原生模块） |
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
