# __tests__ · AGENTS.md

> 模块：React Native 渲染快照测试
> 协议层级：DIP · P2（模块地图）
> 父文档：[../AGENTS.md](../AGENTS.md)
> 测试框架：Jest + react-test-renderer
> 配置文件：[../jest.config.js](../jest.config.js)（preset: `react-native`）

当前仅 1 个测试文件，覆盖 RN 仪表盘的最基本渲染冒烟。

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `App.test.tsx` | Jest 冒烟测试：mock `KinematicsModule` 与 `NativeEventEmitter` 后执行 `renderer.create(<App />)`，验证根组件能挂载不抛错；用 `@jest/globals` 的 `it/jest`，`react-test-renderer` 必须 require 在 `react-native` 之后 | `react-test-renderer`、`App` 来自 `../App`、RN NativeModule mock |

## 扩展建议

- 后续可加：
  - `KinematicsModule` 桥接的 mock 测试（用 `jest.mock('react-native', ...)` 替换 `NativeModules`）。
  - `KinematicsHub.update()` 状态机单元测试（提取到独立 TS 后再测）。
  - F7 Mock Console 按钮的交互测试。
- 任何 RN 侧组件/工具新增 → 在本文件加一行。
- `npm test` 触发全部用例；CI 暂无。
