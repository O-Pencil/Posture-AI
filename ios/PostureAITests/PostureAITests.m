/**
 * @file CatuneTests.m
 * @description RN 内置 iOS 集成测试：等待根 View 出现含 "Welcome to React" 的子视图，超时 600s。
 *
 * [WHO] `@implementation CatuneTests`、`- (BOOL)findSubviewInView:matching:`、`- (void)testRendersWelcomeScreen`
 * [FROM] 依赖 `<UIKit/UIKit.h>`、`<XCTest/XCTest.h>`、`<React/RCTLog.h>`、`<React/RCTRootView.h>`
 * [TO] 被 XCTest 在 `npm run ios -- --config=Debug` 测试时调用；通过 `RCTSetLogFunction` 拦截 RN RedBox
 * [HERE] ios/CatuneTests/CatuneTests.m · RN 默认集成测试（脚手架）
 */
#import <UIKit/UIKit.h>
#import <XCTest/XCTest.h>

#import <React/RCTLog.h>
#import <React/RCTRootView.h>

#define TIMEOUT_SECONDS 600
#define TEXT_TO_LOOK_FOR @"Welcome to React"

@interface CatuneTests : XCTestCase

@end

@implementation CatuneTests

- (BOOL)findSubviewInView:(UIView *)view matching:(BOOL (^)(UIView *view))test
{
  if (test(view)) {
    return YES;
  }
  for (UIView *subview in [view subviews]) {
    if ([self findSubviewInView:subview matching:test]) {
      return YES;
    }
  }
  return NO;
}

- (void)testRendersWelcomeScreen
{
  UIViewController *vc = [[[RCTSharedApplication() delegate] window] rootViewController];
  NSDate *date = [NSDate dateWithTimeIntervalSinceNow:TIMEOUT_SECONDS];
  BOOL foundElement = NO;

  __block NSString *redboxError = nil;
#ifdef DEBUG
  RCTSetLogFunction(
      ^(RCTLogLevel level, RCTLogSource source, NSString *fileName, NSNumber *lineNumber, NSString *message) {
        if (level >= RCTLogLevelError) {
          redboxError = message;
        }
      });
#endif

  while ([date timeIntervalSinceNow] > 0 && !foundElement && !redboxError) {
    [[NSRunLoop mainRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
    [[NSRunLoop mainRunLoop] runMode:NSRunLoopCommonModes beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];

    foundElement = [self findSubviewInView:vc.view
                                  matching:^BOOL(UIView *view) {
                                    if ([view.accessibilityLabel isEqualToString:TEXT_TO_LOOK_FOR]) {
                                      return YES;
                                    }
                                    return NO;
                                  }];
  }

#ifdef DEBUG
  RCTSetLogFunction(RCTDefaultLogFunction);
#endif

  XCTAssertNil(redboxError, @"RedBox error: %@", redboxError);
  XCTAssertTrue(foundElement, @"Couldn't find element with text '%@' in %d seconds", TEXT_TO_LOOK_FOR, TIMEOUT_SECONDS);
}

@end
