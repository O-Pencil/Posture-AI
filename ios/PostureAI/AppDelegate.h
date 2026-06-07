/**
 * @file AppDelegate.h
 * @description iOS 端 RN 宿主 AppDelegate 头文件，继承 RCTAppDelegate。
 *
 * [WHO] 声明 `@interface AppDelegate : RCTAppDelegate`（空体，所有实现来自父类）
 * [FROM] 依赖 `<RCTAppDelegate.h>`、`<UIKit/UIKit.h>`
 * [TO] 被 `ios/Catune/main.m` 的 `UIApplicationMain` 加载；RN runtime 通过 `RCTAppDelegate` 子类协议调用
 * [HERE] ios/Catune/AppDelegate.h · iOS RN 宿主（脚手架，未启用原生模块）
 */
#import <RCTAppDelegate.h>
#import <UIKit/UIKit.h>

@interface AppDelegate : RCTAppDelegate

@end
