# ios · AGENTS.md

> 模块：iOS React Native 脚手架
> 协议层级：DIP · P2（模块地图）
> 父文档：[../AGENTS.md](../AGENTS.md)
> 状态：**标准 RN 脚手架**（未启用任何 Posture-AI 原生模块）

iOS 端目前与 Android 端原生能力未对齐：所有 Posture-AI 业务逻辑（BLE/MCP/MNN/姿态动捕）都在 Android 侧，iOS 仅作为 RN 通用脚手架存在。后续若要 iOS 化，应在 `ios/PostureAI/` 下新建与 `android/.../com/postureai/` 对应的桥接文件，并参考 [../android/app/src/main/java/com/postureai/AGENTS.md](../android/app/src/main/java/com/postureai/AGENTS.md) 的子包结构。

## 成员清单（4 个源文件）

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `PostureAI/AppDelegate.h` | AppDelegate 头声明，继承 `RCTAppDelegate` | 空体，全部逻辑由父类提供 |
| `PostureAI/AppDelegate.mm` | AppDelegate 实现：设置 `moduleName="PostureAI"`、`initialProps={}`，返回 `bundleURL`（Debug 走 Metro，Release 走 `main.jsbundle`） | `RCTBundleURLProvider` |
| `PostureAI/main.m` | Objective-C 入口，`UIApplicationMain(argc, argv, nil, NSStringFromClass([AppDelegate class]))` | UIKit |
| `PostureAITests/PostureAITests.m` | XCTest 集成测试，等待根 View 出现 `Welcome to React` 子视图，超时 600s | `RCTSetLogFunction` 拦截 RedBox |

## 配置与资源

| 文件 | 责任 |
| --- | --- |
| `Podfile` | CocoaPods 配置，使用 RN 0.76 的 `use_react_native!`、target `PostureAI` + `PostureAITests`、启用 `:mac_catalyst_enabled => false` |
| `PostureAI/Info.plist` | `CFBundleDisplayName=PostureAI`、ATS（`NSAllowsArbitraryLoads=false` + `NSAllowsLocalNetworking=true`）、`arm64` only、portrait + landscape 方向 |
| `PostureAI/PrivacyInfo.xcprivacy` | iOS 17+ 隐私清单：仅记录 `FileTimestamp` / `UserDefaults` / `SystemBootTime` 三个系统 API 调用，不收集任何用户数据 |
| `PostureAI/LaunchScreen.storyboard` | 标准 RN 启动屏 |
| `PostureAI/Images.xcassets/` | App 图标资源 |
| `PostureAI.xcodeproj/project.pbxproj` | Xcode 工程文件，target `PostureAI` + `PostureAITests` |
| `.xcode.env` | 注入 `NODE_BINARY` 环境变量给 Xcode build phases 使用 |

## 复赛 iOS 化待办

- 把 Android 的 `MainActivity` / `PostureAIApp` 用 Swift 镜像
- 把 `KinematicsModule` 用 Objective-C++ 桥接到 RN
- 把 MCP HTTP 服务用 `Network.framework` 重新实现（iOS 不支持 Ktor CIO 的某些 API）
- 把 `SpineBluetoothManager` 用 `CoreBluetooth` 镜像
- MNN iOS 库需单独编译（参考 [https://github.com/alibaba/MNN](https://github.com/alibaba/MNN)）

## 维护纪律

- 当前 iOS 端 P3 头部由本次 DIP 整理补齐，但**禁止无脑同步 Android 模块**，避免误导后续维护者认为 iOS 端也有相关实现。
- 任何 iOS 原生模块新增 → 同步在本文档加一行，并新建对应的 P2 子目录 `ios/PostureAI/<Module>/AGENTS.md`。
