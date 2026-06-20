//
//  CatuneMnn.mm
//  端侧 Qwen+MNN 推理的 iOS RN 桥（ObjC++ 骨架，复赛接入）。
//
//  设计：复用安卓侧同一份 C++ 推理核 eyes::EyesLlmSession（android/.../cpp/eyes_llm_session.{h,cpp}）。
//        本文件等价安卓 MnnDebugModule.kt + eyes_mnn_bridge.cpp 的 JNI 层，换成 ObjC++。
//  接入：先编 MNN iOS 静态库/framework、把 C++ 核加入 Xcode target，再把下方 TODO 换成真实调用。
//        当前为占位实现：方法返回"未接入"，不影响目标 A（iOS UI/云端/规则 demo）。
//  详见 docs/iOS适配评估与计划.md。
//
#import "CatuneMnn.h"
// #import "eyes_llm_session.h"   // C++ 核加入 target 后启用

@implementation CatuneMnn {
  BOOL _hasListeners;
}

RCT_EXPORT_MODULE();  // 暴露为 NativeModules.CatuneMnn（与安卓同名）

+ (BOOL)requiresMainQueueSetup { return NO; }

// 流式事件名与安卓一致：onMnnToken / onMnnDone / onMnnError
- (NSArray<NSString *> *)supportedEvents {
  return @[@"onMnnToken", @"onMnnDone", @"onMnnError"];
}
- (void)startObserving { _hasListeners = YES; }
- (void)stopObserving { _hasListeners = NO; }

#pragma mark - 状态

RCT_EXPORT_METHOD(getStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // TODO: eyes::queryCpuCapability() + 模型目录(Documents/mnn_models)检查 → 与安卓同结构
  NSMutableDictionary *status = [NSMutableDictionary dictionary];
  status[@"nativeLibLoaded"] = @NO;   // 接通后置真
  status[@"modelLoaded"] = @NO;
  status[@"modelDirExists"] = @NO;
  status[@"activeModelId"] = @"";
  status[@"loadError"] = [NSNull null];
  // status[@"cpu"] = @{ @"sme2Hw": @NO, @"i8mm": @NO, @"backend": @"unknown", ... };
  resolve(status);
}

#pragma mark - 文本推理

RCT_EXPORT_METHOD(inferText:(NSString *)prompt
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // TODO: 确保模型加载 → eyes::EyesLlmSession::infer(prompt.UTF8String, "", "") → {rawOutput, metrics}
  reject(@"CATUNE_MNN_NOT_IMPLEMENTED", @"iOS 端侧文本推理待接入（复赛）", nil);
}

RCT_EXPORT_METHOD(inferTextStream:(NSString *)prompt
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // TODO: 后台线程跑 infer；期间轮询 session.getPartial() 增量 → emit onMnnToken；结束 emit onMnnDone
  //   if (_hasListeners) [self sendEventWithName:@"onMnnToken" body:@{@"token": delta}];
  if (_hasListeners) {
    [self sendEventWithName:@"onMnnError" body:@{@"error": @"iOS 端侧推理待接入（复赛）"}];
  }
  reject(@"CATUNE_MNN_NOT_IMPLEMENTED", @"iOS 端侧文本流式推理待接入（复赛）", nil);
}

#pragma mark - 图像（VL 体态评估）

RCT_EXPORT_METHOD(analyzeImage:(NSString *)imageBase64
                  prompt:(NSString *)prompt
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  // TODO: base64 → jpeg 落 tmp → eyes::EyesLlmSession::infer(prompt, imagePath, "")
  reject(@"CATUNE_MNN_NOT_IMPLEMENTED", @"iOS 端侧 VL 评估待接入（复赛）", nil);
}

#pragma mark - 基准

RCT_EXPORT_METHOD(runBenchmark:(NSString *)prompt
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  reject(@"CATUNE_MNN_NOT_IMPLEMENTED", @"iOS 基准待接入（复赛）", nil);
}

RCT_EXPORT_METHOD(releaseModel:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  resolve(@YES);
}

@end
