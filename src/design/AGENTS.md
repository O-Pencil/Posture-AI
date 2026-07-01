# src/design · P2 模块地图

> RN UI 组件（TS，iOS/Android 通用，Web 走 RNW）
> 文档协议：DIP P2

## 成员

| 目录/文件 | 职责 |
| --- | --- |
| `AppShell.tsx` | App 外壳（Tab 导航 + 全局下载条） |
| `screens/` | 页面组件（Desk / Plant / Monitor / Settings / Onboarding / Training / Assess / Benchmark） |
| `components/` | 通用组件（LoopTabs / DailyReportPanel / WeeklyReportPanel / ModelDownloadCard / ModelDownloadBanner / LogConsole / TabBar / ...） |
| `theme/` | 设计 token（colors / spacing / radius / font / shadow） |
| `i18n/` | 国际化（en.ts / zh.ts / LocaleContext / types / format） |
| `primitives/` | 基础组件（Card / Button / IconButton / Badge / Chip / SegmentedControl / Field / SwitchRow / ListItem / Section / ProgressBar / Stack） |
| `motion/` | Android/RN 动效入口（MotionView / FadeInView / ScalePressable，底层 Reanimated） |
| `icons/` | 自绘 SVG 图标（DeviceIcon / BatteryIcon / ...） |
| `assets/` | 静态资源（catAnchors / leanAtlas） |

## 关键约束

- **样式走 token**：`theme.spacing.*` / `theme.font.*` / `theme.radius.*` / `theme.colors.*`；硬编码数字占比 < 15%（见 `arch-theme-token-usage`）。
- **i18n 走 hook**：`useT()` / `useLocale()` from `./i18n`；禁止直接 `tr('zh', key)` 在组件里。
- **P3 头部**：每个 .tsx/.ts 都有 `[WHO/FROM/TO/HERE]` 头部（55/55，见 `doc-p3-header-coverage`）。
- **零业务逻辑**：状态/打分在 `src/posture/`；UI 只渲染 `DashboardState`。
- **动效入口**：Android 主线动效统一从 `src/design/motion` 引入；不要在页面里散落 Reanimated worklet。

## 关键页面

- `screens/DeskScreen.tsx` · 实时仪表盘（分数/角度/状态/建议）
- `screens/PlantScreen.tsx` · 植物成长 + 日报/周报
- `screens/SettingsScreen.tsx` · 设置 + 模型管理 + MNN Debug
- `screens/OnboardingScreen.tsx` · 首次启动引导

## 关键组件

- `components/LoopTabs.tsx` · Plant 闭环卡（一级 TAB + 汇总内二级 pill）
- `components/DailyReportPanel.tsx` · 日报视图
- `components/WeeklyReportPanel.tsx` · 周报视图
- `components/ModelDownloadCard.tsx` · 端侧模型管理
- `components/ModelDownloadBanner.tsx` · 全局下载进度条
- `components/TabBar.tsx` · 底部 Tab 导航

## i18n

- `i18n/en.ts` + `i18n/zh.ts` 各 398 键，键完全对齐（见 `arch-i18n-single-source`）。
- `i18n/LocaleContext.tsx` · locale Provider + `useT()` / `useLocale()` hooks。
