# Catune · AGENTS.md

> 目标：保持一个对 Agent 友好、对 vibe coding 友好的 Expo React Native 项目。  
> 文档语言：中文。Commit message 必须中文 Conventional Commits。  
> 框架：**Expo SDK 54 / RN 0.81 一套 TS 跑 iOS、Android、Web（RNW）**。业务零平台耦合（`src/posture/` 纯 TS），MNN/BLE/IMU 通过 `src/platform/` 适配，UI 在 `src/design/`。

---

## 1. 项目定位

Catune 是一个久坐坐姿辅助 App。正式交付是 Expo SDK 54 / React Native 0.81 App，一套 TypeScript 跑 iOS、Android 和 Web（RNW）。当前仓库已清理掉历史 PRD、docs、静态 HTML 原型和 Vite 原型；后续不要把它们重新引入为正式开发入口。

业务链路（d1eb7cf 后保持稳定）：
```
数据源（BLE/WS/DeviceMotion/mock）→ src/posture/engine.ts → DashboardState
                                              ↓
                          src/posture/adviceOrchestrator / growth / reminder
                                              ↓
                                  src/design/AppShell 渲染
```

设计系统：`src/design/primitives/`（12 个）+ `src/design/theme/` + `src/design/i18n/`（398 键 zh/en 对齐）。

---

## 2. 开发入口

### 2.1 命令

```bash
npm run dev        # Expo Web，日常 UI/交互 vibe coding
npm run dev:mobile # Expo Go / 真机
npm run dev:android
npm run dev:ios
npm run preview    # W2 后可用，单页组件预览（URL ?preview=1）
```

### 2.2 验证命令

```bash
npm run tsc:rn              # TypeScript 类型检查
npm test -- --runInBand     # Jest 单测（10 套件 79 测试）
npm run lint                # ESLint
node scripts/check-product-design.mjs   # 设计纪律（primitives 必须用 / 散落样式禁用）
node scripts/check-theme-token-usage.mjs # token 化率 ≥ 40%
node scripts/check-circular-deps.mjs     # 循环依赖
node scripts/check-dead-exports.mjs      # 死导出
node scripts/check-no-color-literal.mjs  # 色值字面量（warn-only，W1 7-04 待补）
```

---

## 3. 目录边界

```text
src/design/      # UI 层：组件库、screens、theme、i18n、primitives
src/posture/     # 纯 TS 业务核心：姿态规则、打分、建议、训练、成长、日报
src/platform/    # 平台适配：DeviceMotion、BLE、WS、Vibration、FileSystem、memory
src/mnn/         # 端侧模型：下载、设备推荐、推理流式客户端、原生调试边界
src/assess/      # 视觉评估服务：cloud/local/preset
src/constants/   # appMeta / logo
src/debug/       # 日志总线 logBus
android/         # Android 原生壳 + MNN JNI 支线
ios/             # iOS 原生壳 + CatuneMnn 占位模块
training/        # 模型微调链路（LoRA + 合并 + 评估）
scripts/         # 构建 / 打包 / 检查 / SME2 演示脚本
public/          # App 视觉资源
docs/            # 联调 / 硬件 / API 等工程文档（8 份已恢复）
```

---

## 4. Agent 修改规则

- 涉及用户可见 UI、文案、交互、流程、状态、可访问性或响应式行为时，先加载 `.agents/skills/catune-product-design/SKILL.md`，按它路由到最小必要参考。
- UI 改动统一放在 `src/design/`。
- 页面放 `src/design/screens/`；可复用组件放 `src/design/components/`；基础原语放 `src/design/primitives/`。
- 主题 token 放 `src/design/theme/`；不要在页面里随意散落颜色、半径、阴影和字号。
- 文案走 `src/design/i18n/`；新增 key 必须同时补 `en.ts` 和 `zh.ts`。
- 姿态分类、分数、建议兜底、禁词逻辑只放 `src/posture/`。
- DeviceMotion、BLE、震动、文件系统、NativeModules 不要直接写进 UI 组件，必须经 `src/platform/` 或 `src/mnn/`。
- 改 UI 时用 `src/design/primitives/` 已有的组件（Card/Button/Field/SegmentedControl/Stack/...），不要重新发明。
- 不要新增 `docs/`、`PRD/`、`prototype/`、`web/` 作为项目知识或正式 UI 来源。
- 如果需要长期说明，更新 `README.md` 或本文件；不要分散新文档。

---

## 5. UI 工作流

1. 用 `npm run dev` 打开 Expo Web。
2. 按 `.agents/skills/catune-product-design/SKILL.md` 确认这次是 Shape / Implement / Review / Copy / Harden。
3. 改 `src/design/screens/*` 或 `src/design/components/*`；优先复用 `src/design/primitives/*`。
4. 抽出重复视觉模式到 `src/design/components/` 或 `src/design/primitives/`。
5. 需要跨屏统一的视觉变量时，先加到 `src/design/theme/`。
6. 完成后跑 `npm run tsc:rn`、`npm test -- --runInBand`、`npm run lint`、`npm run design:check`。

---

## 6. 当前架构要点

- `App.tsx` 持有姿态引擎、数据源、记忆服务、成长追踪、提醒服务，并渲染 `src/design/AppShell`。
- `src/posture/engine.ts` 是姿态规则状态机和安全兜底的核心。
- 数据源优先级：BLE 姿态带、WS 接收、DeviceMotion、mock 兜底。
- Android MNN 原生能力默认不编；只有明确做端侧模型联调时才进入 `android/` 和 `src/mnn/`。
- iOS 端侧模型：`ios/CatuneMnn/` 占位模块存在但默认不编；决赛演示走 M1 浏览器（RNW）+ 真机 Expo Go 路线。

---

## 7. 模拟器开发（Expo Go / Web / Android Emulator）

> 目标：零真机依赖的情况下跑全链路，最快反馈 UI + 业务逻辑。

### 7.1 Expo Web（首选日常开发）

```bash
npm run dev    # expo start --web
```

- 浏览器开 `http://localhost:8081`，自动 fallback 到 **mock 数据源**（无 IMU）。
- RNW bundle 编译约 10 秒（6844 modules），增量 HMR 数秒。
- Settings 页 → F7 演示台：切换 `NORMAL / SLUMPED / TECH_NECK / LEFT_LEAN / OFFLINE` 五个 mock 场景。
- 验证清单：刷新页面 / 切 Tab / 切语言（en ↔ zh）/ 切 mock 场景 → 状态卡片 + 建议文案 + Plant 成长值正确变化。

### 7.2 Android Emulator（arm64 + MNN 链路）

#### 7.2.1 启动

```bash
# 方式 A：Expo CLI 直接跑（首次会触发 prebuild + gradle 同步）
npm run dev:android

# 方式 B：先启 Metro，再用本地 aapt/gradle 安装
npm start                    # Metro bundler
npx expo run:android         # 另开终端
```

#### 7.2.2 AVD 创建（一次性）

1. **Android Studio → Tools → Device Manager → Create Device**
2. 选硬件：Pixel 6 / Pixel 7（arm64 都行）
3. 系统镜像：**API 34 (Android 14) arm64-v8a with Google Play**（不要选 x86_64，MNN 必须 arm64）
4. RAM ≥ 4GB、VM Heap ≥ 512MB（吃 MNN 时会撑）
5. 启用 **Host GPU**（默认是 Software，模拟器会卡）
6. **Storage ≥ 8GB**（`filesDir/mnn_models/qwen2.5-0.5b/` ~550MB + 系统）

#### 7.2.3 首次启动流程

```bash
# 1. 启 Metro
npm start

# 2. 预检工程（缺文件先报）
node scripts/check-android-build-ready.mjs

# 3. 构建并安装到模拟器（首次 ~5-10 分钟）
npx expo run:android

# 4. 失败时单独跑构建
cd android && ./gradlew assembleDebug
```

#### 7.2.4 调试快捷键（adb logcat 视角）

| 按键 | 作用（Expo dev menu） |
|---|---|
| `r` | 重新加载 JS bundle（不重启 native） |
| `j` | 打开 Chrome DevTools（JS debugger） |
| `m` | 切换开发菜单显示 |
| `⇧ m` | 切换 performance monitor |
| `e` | 触发 JS error（边界测试） |

模拟器本身：`⌃ M`（Mac）/ `Ctrl+M`（Win）打开 dev menu。

#### 7.2.5 MNN 链路调试（端侧模型 IME 路径）

```bash
# 默认不编 MNN（保证纯 RN 在任意机器可编）
./gradlew assembleDebug

# 打开 MNN 编入（需 cpp/third_party/MNN 源码 + arm64 libMNN.so）
./gradlew assembleDebug -PenableMnn=true
# 或指定外部 MNN 源
./gradlew assembleDebug -PenableMnn=true -DmnnSourceRoot=/path/to/MNN
```

**App 内入口**：Settings → 「设备指标 + MNN」折叠卡 → 看到 CPU 后端 / SME2 标志位 → 跑 INFER / 跑 BENCH。

**预期行为**：
- 模拟器 IME `sme2:0`（CPU 虚拟，**预期内**）
- 输出 `!!!!` 乱码 → 也是预期（模型在模拟器偶发，但**链路通 loaded=true**）
- 真机（小米14）`sme2:0` 也是已知，详见 `docs/联调进度与实测记录.md` §6
- Mac Docker A1/A2 容器化 Arm CPU → 中文推理 ✅ → 见 `docs/联调进度与实测记录.md` §7

#### 7.2.6 常见错误

| 症状 | 处理 |
|---|---|
| `HAXM not installed` | Mac 装 Intel HAXM；Linux/ARM Mac 改用 KVM（Docker 路线） |
| `adb: device offline` | `adb kill-server && adb devices` |
| `Could not install Gradle distribution` | 检查 `android/gradle/wrapper/gradle-wrapper.properties` URL；公司代理 → `~/.gradle/init.gradle` |
| `expo prebuild` 报 native config conflict | 先 `expo prebuild --clean` |
| Port 8081 占用 | `lsof -i :8081` 杀进程，或 `npm start -- --port 8082` |
| 模拟器白屏 | `adb shell input keyevent 82` 解锁屏幕 |
| `libMNN.so` 未加载 | 跑 `./gradlew assembleDebug -PenableMnn=true` 重编 |

#### 7.2.7 验证脚本

```bash
node scripts/check-android-build-ready.mjs   # 工程文件 + 工具链预检
node scripts/check-mnn-device.ps1            # Windows 端 MNN 设备验证（Mac 跳过）
```

#### 7.2.8 路径提示

- `android/` 是 `expo prebuild` 产物，已加 git。改前先看 `ios/AGENTS.md` 和 `android/app/src/main/cpp/CMakeLists.txt`（d1eb7cf 顺手清理了 docs 链接，详见 `Plans/d1eb7cf变更总结-2026-07-01.md`）。
- MNN 编译产物：`android/app/build/intermediates/cmake/<variant>/obj/arm64-v8a/libMNN.so` ~5.1MB。
- 修改原生代码后用 **`r` reload JS** 即可生效；改 `AndroidManifest.xml` / `build.gradle` 需要 **冷启模拟器**。
- 历史踩坑：`docs/真机模拟器测试反馈.md`。

### 7.3 iOS Simulator

```bash
npm run dev:ios
```

- Simulator 无真实 IMU，自动走 mock；适合 iOS 平台 UI 调试。
- iOS MNN：**默认不编**（`ios/CatuneMnn/` 仅占位）。需要演示 iOS 端侧模型时改 `ios/CatuneMnn/CatuneMnn.podspec` 加 MNN source。

### 7.4 Mock 调试金标准

`src/posture/mock.ts` 是离线调试入口，**所有 UI 状态都应能用 mock 触发**：

| Mock 场景 | 触发姿态 | 验证点 |
|---|---|---|
| `NORMAL` | neck/thor/lumbar ≈ 0 | Desk 卡片绿色 / Plant 成长 + |
| `SLUMPED` | 整体前倾 | 触发 NECK_PITCH 提醒 / 异常时长累加 |
| `TECH_NECK` | 仅颈前倾 | 头前倾单独告警 |
| `LEFT_LEAN` | 腰椎侧倾 | LUMBAR_ROLL 提醒 |
| `OFFLINE` | 数据源中断 | 状态降级提示 |

---

## 8. 真机开发（iOS / Android）

### 8.1 iOS 真机（iPhone via Expo Go）

```bash
npm run dev:mobile
# Expo Go app → 扫码 → 自动载入
```

- 真机 DeviceMotion 有效：`src/platform/deviceMotionReader.ts` 走 `expo-sensors`。
- 数据源链路：iPhone → DeviceMotion → `createPostureEngine` → 三节点（颈/胸/腰）几何映射 → 状态。
- 验证：单手机 IMU 临时映射为颈/胸/腰三路演示值（详见 `AGENTS.md` §6 / `docs/api-engine.md`）。

### 8.2 Android 真机（arm64 主流机型）

- ARM64 真机 IME 仍可能 `sme2:0`（如小米14，见 `docs/联调进度与实测记录.md` §6），**SME2 加速需特定 Arm 芯片**。
- 推荐路线：先 Android 真机跑通 `libMNN.so` + `inferText` + 中文输出，再追 SME2 加速。
- 接线详见 `docs/硬件单板自检指南.md` §3。

### 8.3 硬件姿态带（BLE，ESP32-S3 + BNO085）

- BLE 数据源：`src/platform/bleSensorSource.ts`，优先于 DeviceMotion。
- 固件：`firmware/catune_node/catune_node.ino`（ESP32-S3 主推，C6 需改 I2C 引脚）。
- 协议：`docs/BLE协议与固件.md`。
- 接线清单：`docs/硬件采购与小白使用指南.md`。
- 自检 SOP：`docs/硬件单板自检指南.md`。

### 8.4 兜底 WS（另一台手机当姿态带）

- `src/platform/wsSensorSource.ts`（接收）+ `src/platform/wsSenderSource.ts`（发送）。
- 启动一个本地 WS 中继：`scripts/ws-relay/`。
- 适用：杜邦线没到 / ESP32 没烧通时，用第二台手机当临时姿态带。

### 8.5 真机 smoke 流程（W3 7-13）

1. iPhone via Expo Go：打开 → Desk → 切 mock 场景 → 触发提醒 → 截图。
2. M1 Safari via Expo Web：同样链路。
3. Android arm64 真机（如有）：同上 + 跑 Settings → MNN DEBUG → `loaded=true` → INFER。
4. 记录所有卡顿 / crash 到 `docs/demo-smoke-0713.md`。

---

## 9. 模型调试（端侧 MNN 链路）

### 9.1 模型清单

`src/mnn/modelCatalog.ts` 定义模型元数据 + 下载 URL：

| 模型 ID | 大小 | 来源 | 用途 |
|---|---|---|---|
| `Qwen2.5-0.5B-Instruct-MNN` (INT4) | ~550MB | huggingface `taobao-mnn/Qwen2.5-0.5B-Instruct-MNN` | 联调默认；模拟器 / 低 RAM 友好 |
| `Qwen3-1.7B-...` | ~1.7GB | （待补） | SME2 真机验收 |

切换默认：`DEFAULT_MODEL_ID` 在 `modelCatalog.ts` 顶部。

### 9.2 设备自适应

`src/mnn/deviceProfile.ts`：

- 探测：RAM / CPU 架构 / SME2 能力 / 可用存储
- 分级：`DeviceTier`（LOW / MID / HIGH）
- 推荐：`recommendModel()` 返回 `ModelRecommendation` + 推荐理由
- UI 入口：Settings → 模型管理卡片展示「为你的设备推荐：__，理由：__」

### 9.3 下载服务

`src/mnn/modelDownloadService.ts`：

- 断点续传 / 后台下载 / 自动续传 / 多模型切换 / 删除 / `.active` 活跃文件标记
- 进度可视化：`src/design/components/ModelDownloadBanner.tsx`（全局）+ `ModelDownloadCard.tsx`（列表）
- 存储路径：`filesDir/mnn_models/<model_id>/`

### 9.4 原生调试客户端

`src/mnn/nativeDebugClient.ts` 是 CatuneMnn 原生模块的 TS 边界，UI 只调用这里：

```ts
import {
  isCatuneMnnAvailable,
  getMnnStatus,        // {sme2Hw, libSme2, i8mm, dot, fp16, backend, readiness}
  inferMnnText,        // (prompt) => Promise<{text, ttftMs, prefillMs, decodeMs, tokensGenerated, decodeTps}>
  runMnnBenchmark,     // () => Promise<{tokensPerSec, ...}>
  releaseMnnModel,
} from '../../mnn/nativeDebugClient';
```

### 9.5 Settings → MNN DEBUG 入口

- `src/design/screens/SettingsScreen.tsx` 有「设备指标折叠 + 模型基准测试」面板
- 可手动：选择活跃模型 / 跑 INFER / 跑 BENCH / 看 CPU 后端 / 看 SME2 标志位

---

## 10. 推理（端侧 LLM 流式）

### 10.1 推理客户端

`src/mnn/inferStreamClient.ts`：

```ts
import {streamInfer, isModelAvailable} from '../../mnn/inferStreamClient';

const cancel = streamInfer(prompt, {
  onToken: (t) => {/* 逐字回写 */},
  onDone: (full) => {/* 流结束 */},
  onError: (e) => {/* 错误兜底 */},
});
// cancel() // 取消
```

- 优先走原生流式（`CatuneMnn.inferTextStream` + `onMnnToken/onMnnDone/onMnnError`）
- 原生无流式方法时回退 `inferText`（一次性，异步后台）
- 上层（`src/posture/adviceOrchestrator.ts`）调用约定一致

### 10.2 姿态建议编排

`src/posture/adviceOrchestrator.ts`：

- 监听 `engine` 状态变化
- 触发条件：姿态变化 / 异常持续 N 分钟 / 主动查询
- 文案生成走模型流式；规则兜底（`src/posture/coachPrompt.ts` + `actionTag.ts`）
- 兜底链路：模型不可用 → 规则引擎直接出文案（仍走 i18n）

### 10.3 流式前端展示

`src/design/components/LogConsole.tsx` + 即将新增的 `TokenStreamView`（W2）展示流式输出。

### 10.4 已知实测结论

- **Mac Docker A1/A2 SME2**：`docs/联调进度与实测记录.md` §7 记录了 SME2 加速可行（容器化 Arm CPU）。
- **Android 真机**：小米14 + Mac QEMU 均 `sme2:0`，**编译 ✅ 运行 ❌**（需特定 Arm 芯片）。
- **Qwen2.5-0.5B INT4**：中文输出 ✅；输出乱码多为模拟器预期行为。

---

## 11. 微调（LoRA + 合并 + 评估）

> 训练产物已入 `training/`。脚本在 `scripts/`。本节只覆盖 Agent 触发微调的最短路径。

### 11.1 数据准备

```bash
# 生成训练数据（基于历史坐姿数据 + 教练 prompt）
python3 training/gen_dataset.py
# → training/data/<split>.jsonl
```

格式：`{"prompt": "...", "response": "..."}` 一行一条 JSON。

### 11.2 训练（LoRA）

```bash
# 单卡 LoRA 训练（参考训练配置在 training/configs/）
python3 training/train_sft.py \
  --base_model Qwen2.5-0.5B-Instruct \
  --data training/data/ \
  --output_dir training/saves/<run_name>/ \
  --lora_rank 8 --lora_alpha 16 --epochs 3
# 训练日志 → training/train.log
# 训练曲线 → training/loss_curve.png（用 plot_loss.py 生成）
```

### 11.3 合并（LoRA → 独立模型）

```bash
python3 training/merge_lora.py \
  --base Qwen2.5-0.5B-Instruct \
  --lora training/saves/<run_name>/ \
  --output training/saves/<run_name>_merged/
```

合并后转 MNN：`MNNConvert`（详见 `scripts/` 与 MNN 官方文档）。

### 11.4 评估

```bash
# 对比基线与微调版本的多项指标
python3 training/compare.py \
  --baseline Qwen2.5-0.5B-Instruct-MNN \
  --finetuned training/saves/<run_name>_merged/ \
  --md   # 导出 training/compare.md
```

### 11.5 回灌 App

把合并后的 MNN 模型放到 `filesDir/mnn_models/<new_model_id>/`，在 `src/mnn/modelCatalog.ts` 加一条 `MnnModelDef`，重启 App → Settings → 模型管理 → 切换到新模型 → 验证。

---

## 12. 提交规范

Commit message 必须中文 Conventional Commits：

```text
feat(design): 优化书桌页状态卡片
fix(posture): 修复头前倾动作标签解析
chore: 清理历史原型目录
```

常用 scope：`design` `posture` `platform` `mnn` `assess` `android` `ios` `plans` `docs`。

---

## 13. 决赛前时间线（速查）

- **W1（7-01 ~ 7-05）地基周**：ESLint 边界 + 色值检查 + App.tsx 拆分。详见 `Plans/决赛前开发排期-2026Q3-w1.md`。
- **W2（7-06 ~ 7-12）交付周**：单页预览 `_preview.tsx` + Expo Web 验证 + AI 文档自动生成。
- **W3（7-13 ~ 7-15）演讲冲刺**：真机 smoke + 演讲稿 + 设计师入场测试。

---

## 14. 关键文档索引

| 文档 | 用途 |
|---|---|
| `docs/api-engine.md` | API 工程契约（`engine.ts` 输入输出） |
| `docs/BLE协议与固件.md` | 硬件姿态带 BLE 协议 |
| `docs/硬件单板自检指南.md` | 烧录前单板自检 SOP |
| `docs/硬件采购与小白使用指南.md` | 接线 / 采购清单 |
| `docs/真机模拟器测试反馈.md` | 历史踩坑 |
| `docs/联调进度与实测记录.md` | MNN 联调进度 + 实测数据 |
| `docs/端侧模型对接计划.md` | 端侧模型集成计划 |
| `docs/模型与记忆个性化设计.md` | 产品语义 / 决赛问答 |
| `.agents/skills/catune-product-design/SKILL.md` | 设计师 + AI 改稿入口 |
| `README.md` | 项目 README |
| `Plans/决赛前开发排期-2026Q3-w1.md` | W1 详细排期 |