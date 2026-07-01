# Catune

Catune 是一个 Expo SDK 54 / React Native 0.81 App，用一套 TypeScript 同时跑 iOS、Android 和 Web(RNW)。当前目标是保留一个干净、可快速迭代、对 Agent 友好的正式 App 工程，不再维护历史 PRD、静态 HTML 原型或 Vite 原型工程。

## 快速开始

```bash
npm install
npm run dev        # 浏览器中调正式 RNW App，适合 vibe UI/交互
npm run preview    # 固定状态沙盒，适合快速调 UI 状态和交互
npm run dev:mobile # Expo Go / 真机预览，适合传感器联调
```

原生构建入口：

```bash
npm run dev:android
npm run dev:ios
```

## 项目结构

```text
src/
  design/    # UI、组件、screens、theme、motion、i18n；日常 vibe coding 主入口
  posture/   # 纯 TS 姿态规则、打分、建议、训练、成长与报告
  platform/  # 传感器、BLE、震动、文件系统、语义记忆等平台适配
  mnn/       # 模型清单、下载、设备推荐、端侧推理 JS 客户端
  assess/    # 体态视觉评估：云端 / 本地 / 预置兜底
  debug/     # App 内日志总线
android/     # Android 原生壳与 MNN JNI 支线
ios/         # iOS 原生壳与 CatuneMnn 占位模块
public/      # App 可复用视觉资源
firmware/    # BLE 姿态带固件实验
training/    # 模型微调实验
scripts/     # 构建、检查、资源生成脚本
```

## 开发方式

- 改 UI 和交互：优先看 `src/design/screens/` 和 `src/design/components/`。
- 调固定状态：跑 `npm run preview`，在 Preview Sandbox 里切坐姿、离线、模型生成中、规则兜底和中英语言。
- 改视觉规范：改 `src/design/theme/`，不要在页面里散落新颜色和尺寸。
- 改 Android 动效：从 `src/design/motion/` 引入 `MotionView` / `FadeInView` / `ScalePressable`，不要在页面里散用 Reanimated。
- 改文案：改 `src/design/i18n/en.ts` 与 `src/design/i18n/zh.ts`，保持 key 对齐。
- 做用户可见改动：按 `.agents/skills/catune-product-design/SKILL.md` 的 Shape / Implement / Review / Copy / Harden 模式走。
- 改姿态判断：改 `src/posture/engine.ts` 和相关测试。
- 改传感器/BLE/文件系统：改 `src/platform/`，不要把原生能力写进 UI 组件。
- 改端侧模型管理：改 `src/mnn/`，Android 原生桥在 `android/app/src/main/`。
- 沉淀设计规则：先看 `.agents/skills/catune-product-design/references/review-loop.md`，再决定放进 guidance、lint、exemplar、test 或 coverage gap。

## 验证

```bash
npm run verify # Agent/提交前权威检查
```

`npm run verify` 会串起 lint、TypeScript、Jest、设计纪律、token 化率、循环依赖、死导出和色值字面量提示。GitHub Actions 也跑同一条命令。

单项脚本：

| 命令 | 用途 |
| --- | --- |
| `npm run lint` | ESLint，要求 0 error |
| `npm run typecheck` / `npm run tsc:rn` | TypeScript 类型检查 |
| `npm test -- --runInBand` | Jest 单测 |
| `npm run check:design` | 设计纪律与目录边界 |
| `npm run check:tokens` | `src/design` token 化率 |
| `npm run check:deps` | `src/` 循环依赖 |
| `npm run check:exports` | `src/` 死导出 |
| `npm run check:colors` | 色值字面量提示，warn-only |

## 清理后的约定

- 不再新增 `docs/`、`PRD/`、`prototype/`、`web/` 作为正式开发入口。
- 不再用静态 HTML 或 Vite 原型承载正式 UI。
- 正式 UI 统一收在 `src/design/`。
- 新功能优先落在现有边界内；需要新边界时先更新 `AGENTS.md`。
