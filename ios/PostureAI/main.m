/**
 * @file main.m
 * @description iOS 端 Objective-C 入口，把控制权交给 UIApplicationMain 并指定 AppDelegate 类。
 *
 * [WHO] `int main(int argc, char *argv[])` 函数体（@autoreleasepool 内 UIApplicationMain）
 * [FROM] 依赖 `<UIKit/UIKit.h>`、本地 `AppDelegate.h`
 * [TO] 被 iOS app 启动时调用，桥接到 AppDelegate
 * [HERE] ios/Catune/main.m · iOS 入口（脚手架）
 */
#import <UIKit/UIKit.h>

#import "AppDelegate.h"

int main(int argc, char *argv[])
{
  @autoreleasepool {
    return UIApplicationMain(argc, argv, nil, NSStringFromClass([AppDelegate class]));
  }
}
