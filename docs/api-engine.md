# Posture Engine API 文档

> `src/posture/engine.ts` · 跨平台姿态引擎（TS，iOS/Android/Web 通用）
> 单一职责：3 节点规则状态机 + 0-100 打分 + 建议查表 + 禁词 + 规则兜底

---

## 公共 API 概览

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `THRESHOLDS` | const object | 3 节点姿态阈值（PRD §3.3） |
| `PostureEngine` | type | 引擎实例接口（subscribe / update / getState / setModelAdvice / stop） |
| `EngineOptions` | type | `createPostureEngine` 选项（locale / onFeedback） |
| `createPostureEngine` | function | 创建引擎实例（iOS/Android 通用入口） |
| `ruleFallback` | function | 规则兜底：纯离线建议生成（端侧模型失败时回退） |
| `sanitize` | function | 禁词替换（任何文案输出前必须调用） |
| `getBannedWords` | function | locale 感知的禁词列表（用于模型输出过滤） |
| `SAFE_FALLBACK` | const string | 空反馈兜底（兜底的兜底） |
| `Locale` | type | re-export from `../ui/i18n`（en / zh） |
| `getDict` | function | re-export from `../ui/i18n`（用于键枚举） |

> **未导出（内部）**：`classifyAndAction` / `severityOf` / `signalsFrom` / `formatAdvice` —— agent 内部使用，无需对外。

---

## 1. `createPostureEngine(opts?)` · 工厂函数

```ts
function createPostureEngine(opts?: EngineOptions): PostureEngine;
```

### EngineOptions

```ts
type EngineOptions = {
  locale?: Locale;          // 'en' | 'zh'，默认 'en'
  onFeedback?: (fb: PostureFeedback) => void;  // 反馈变化时触发（首次 + 后续重算）
};
```

### PostureEngine 实例方法

```ts
type PostureEngine = {
  /** 订阅状态变化（10Hz 帧驱动）。返回 unsubscribe 函数。 */
  subscribe(listener: (state: DashboardState) => void): () => void;

  /** 推入 3 节点原始角度（度）。iOS/Android 通用入口；mock/sensor 调用方负责节流。 */
  update(neckPitch: number, thorPitch: number, lumbarRoll: number): void;

  /** 读取当前仪表盘状态（分数/角度/状态/建议）。 */
  getState(): DashboardState;

  /** 端侧模型生成的建议写回（异步流式）。会被 10Hz 帧节流，不被覆盖。 */
  setModelAdvice(advice: string, source: InferenceSource): void;

  /** 停止：清理订阅 + 内部状态。 */
  stop(): void;
};
```

### 用法示例

```ts
import {createPostureEngine} from './posture/engine';

const engine = createPostureEngine({
  locale: 'zh',
  onFeedback: (fb) => console.log('姿态变化:', fb),
});

const unsub = engine.subscribe((state) => {
  // state.score: 0-100
  // state.posture: 'NORMAL' | 'SLUMPED' | 'TECH_NECK' | 'LEFT_LEAN'
  // state.advice: i18n 文案（locale 感知）
});

// 推入数据（10Hz mock 或 100ms 节流后的真硬件）
engine.update(neckDeg, thorDeg, lumbarDeg);

// 模型异步覆盖建议（不会被 update 覆盖）
engine.setModelAdvice('试试收紧下巴 5 秒', 'qwen-local');

// 清理
unsub();
engine.stop();
```

---

## 2. `THRESHOLDS` · 姿态阈值常量

```ts
export const THRESHOLDS = {
  neckTechDeg: 20,    // 颈椎前倾 > 20° = TECH_NECK
  thorSlumpDeg: 15,   // 胸椎后凸 > 15° = SLUMPED（驼背主指标）
  lumbarLeanDeg: -10, // 腰椎侧倾 < -10° = LEFT_LEAN
};
```

> 与 PRD §3.3 严格对齐。改这里会同时影响 `ruleFallback`、传感器日志和 UI 颜色映射。

---

## 3. `ruleFallback(signals, locale?)` · 规则兜底

```ts
function ruleFallback(
  signals: PostureSignals,
  locale?: Locale,
): PostureFeedback;
```

**何时调用**：端侧模型推理失败 / 用户设备无可用模型 / PRD §5.10 "分类/打分用规则（可靠底线）"。

**返回**：`PostureFeedback` 含 advice / severity / posture / source = 'rule'。

**永远可用**：纯函数，0 依赖，可单测覆盖（见 `src/posture/__tests__/engine.test.ts`）。

---

## 4. `sanitize(text, locale?)` · 禁词过滤

```ts
function sanitize(text: string, locale?: Locale): string;
```

**何时调用**：任何文案输出到 UI 之前（模型输出 / 用户输入回显）。

**禁词分类**（PRD §6.3）：诊断（确诊/疾病/cure/disease）/ 治疗承诺（治疗/guarantee）/ 营销（100%/绝对）。

**降级**：触发禁词时整句替换为 `SAFE_FALLBACK`（空串），UI 显示"暂无建议"。

---

## 5. `getBannedWords(locale)` · 禁词列表

```ts
function getBannedWords(locale: Locale): string[];
```

**用法**：调试 / 单元测试断言 / 设置面板的"内容规范"展示。

---

## 6. 行为常量（内部，PRD §3.4）

```ts
const DURATION_FOR_BUMP_MIN = 45;    // 异常持续 ≥ 45 分钟，严重度 +1
const SEVERITY_EXCESS_MINOR = 10;   // 超出阈值 10° → severity 2
const SEVERITY_EXCESS_MAJOR = 20;   // 超出阈值 20° → severity 3
const SENSOR_LOG_THROTTLE_MS = 1000;// 传感器演示日志节流到 1Hz
```

---

## 7. 数据流

```
sensorSource/mock ─── update(n,t,l) ──► engine.classifyAndAction
                                          ↓
                                   severityOf
                                          ↓
                                   formatAdvice (i18n)
                                          ↓
                                   sanitize (禁词)
                                          ↓
                                   subscribe ──► App.tsx 仪表盘
```

模型异步覆盖：
```
inferStreamClient ── setModelAdvice(text, 'qwen-local') ──► engine 内部粘性
                                                              不被 update() 覆盖
                                                              直到下次变化
```

---

## 8. 兼容性

- **iOS / Android / Web**：纯 TS，零 `react-native` / `expo` 依赖（详见 `arch-posture-pure-ts`）。
- **测试**：9 个 it 覆盖 4 姿态分类 + 禁词 + sanitize（`src/posture/__tests__/engine.test.ts`）。
- **下游**：`mock.ts` / `sensorSource.ts` 调用 `update`；`adviceOrchestrator.ts` 调用 `setModelAdvice`；UI 订阅 `subscribe`。

---

## 9. 变更日志

| 日期 | 变更 |
| --- | --- |
| 2026-06 | 增加 4 个具名行为常量（替代裸数字，见 `polish-no-magic-strings`） |
| 2026-06 | 增加 `ruleFallback` 作为端侧模型兜底（PRD §5.10） |
| 2026-06 | 从 Kotlin 侧迁移（`KinematicsHub`/`KinematicsModule` 已删），单 TS 来源 |