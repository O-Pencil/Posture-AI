// Expo SDK 54 metro 配置 + 共享主工程 ../src 的纯 TS 逻辑/UI（相对地址引用，单一来源、不复制）。
// 这样 expo-preview 直接复用 src/posture/ 的 engine/types/mock/Dashboard。
const {getDefaultConfig} = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 让 metro 监视主工程根的 src/（共享 posture 逻辑 + Dashboard UI）
config.watchFolders = [path.resolve(repoRoot, 'src')];

// 模块优先从本预览工程自己的 node_modules 解析（拿到 RN 0.81，不串到主工程的 RN 0.76）
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
