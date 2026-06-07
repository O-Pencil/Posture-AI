/**
 * @file index.js
 * @description React Native 入口，把 App 组件注册到 AppRegistry。
 *
 * [WHO] 默认导出无（侧效执行）：`AppRegistry.registerComponent(appName, () => App)`，从 `app.json` 读取 name = "Catune"
 * [FROM] 依赖 `react-native` 的 `AppRegistry`、本地 `App` 组件、`./app.json` 的 name
 * [TO] 被 Metro + RN runtime 加载；驱动整个 RN 桥启动
 * [HERE] 项目根 /index.js · RN 应用入口
 */
/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
