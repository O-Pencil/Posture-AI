// @file eyes_log.h
// @description Android logcat 宏封装：EYES_LOGD / EYES_LOGE，tag = "CatuneMNN"。
//
// [WHO] 定义 `EYES_LOG_TAG` 常量与 `EYES_LOGD(...)` / `EYES_LOGE(...)` 宏
// [FROM] 依赖 `<android/log.h>`
// [TO] 被 `eyes_mnn_bridge.cpp` / `eyes_llm_session.cpp` 调用
// [HERE] android/app/src/main/cpp/eyes_log.h · 日志宏（header-only）
#pragma once
#include <android/log.h>

#define EYES_LOG_TAG "CatuneMNN"
#define EYES_LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, EYES_LOG_TAG, __VA_ARGS__)
#define EYES_LOGE(...) __android_log_print(ANDROID_LOG_ERROR, EYES_LOG_TAG, __VA_ARGS__)
