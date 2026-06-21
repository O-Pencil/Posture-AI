# src/posture · P2 模块地图

> 跨平台姿态核心（TS，iOS/Android/Web 通用，零 react-native/expo 依赖）
> 文档协议：DIP P2

## 成员

| 文件 | 职责 |
| --- | --- |
| `engine.ts` | 规则状态机 + 0-100 打分 + 建议查表 + 禁词 + 规则兜底（核心入口） |
| `mock.ts` | 10Hz 模拟数据源 + F7 场景锁定 |
| `types.ts` | 数据契约：PostureSignals / KinematicsState / DashboardState / PostureFeedback |
| `utils.ts` | 共享工具函数（clamp / pad / ABNORMAL_POSTURES） |
| `actionTag.ts` | 动作标签解析（`[动作:xxx]` 提取） |
| `adviceOrchestrator.ts` | 端侧模型建议异步编排（流式写回引擎） |
| `coachPrompt.ts` | 教练 prompt 构造（含语义记忆注入） |
| `exercises.ts` | 训练动作例程表（SLUMPED→胸椎伸展 / TECH_NECK→颈后收 / LEFT_LEAN→肩胛后收） |
| `growth.ts` | 植物成长累加器（今日积分 / 阶段跃迁） |
| `dailyReport.ts` | 日报/周报构建（规则兜底） |
| `__tests__/engine.test.ts` | 9 个 it 覆盖 4 姿态分类 + 禁词 + sanitize |

## 关键约束

- **零原生依赖**：禁止 `import 'react-native'` / `import 'expo-*'`，违反破坏跨平台性（见 `arch-posture-pure-ts`）。
- **数据来源**：`src/platform/sensorSource.ts` 推 `update()`；`src/platform/reminder.ts` 读 `subscribe()`；`src/platform/dailyHistory.ts` 持久化；`src/platform/memory/*` 语义记忆。
- **下游**：`App.tsx` 仪表盘订阅；`src/ui/components/*` 消费 `DashboardState`。
- **i18n 依赖**：`../ui/i18n`（en/zh），文案生成走 `tr(locale, key)`。

## 关键 API

- `createPostureEngine(opts?)` · 工厂（见 `docs/api-engine.md`）
- `ruleFallback(signals, locale?)` · 端侧模型失败兜底
- `THRESHOLDS` · 3 节点姿态阈值（PRD §3.3）

## 已删除（迁移到 TS 后）

- Kotlin `KinematicsHub` / `KinematicsModule` / `posture/*`（PRD §0.5.7）