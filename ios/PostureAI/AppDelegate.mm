/**
 * @file AppDelegate.mm
 * @description iOS 端 RN 宿主 AppDelegate 实现，设置 moduleName="PostureAI" + 空 initialProps，返回 bundleURL。
 *
 * [WHO] `@implementation AppDelegate`、`- (BOOL)application:didFinishLaunchingWithOptions:`、`- (NSURL *)sourceURLForBridge:`、`- (NSURL *)bundleURL`
 * [FROM] 依赖 `<React/RCTBundleURLProvider.h>`、`<RCTAppDelegate.h>`、父类 RCTAppDelegate
 * [TO] 被 iOS runtime 通过 `UIApplicationMain` 调用；返回的 bundleURL 决定 RN 加载 Metro 远程包（Debug）还是内嵌 `main.jsbundle`（Release）
 * [HERE] ios/PostureAI/AppDelegate.mm · iOS RN 宿主实现（脚手架）
 */
#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"PostureAI";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
