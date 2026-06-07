// @file eyes_mnn_bridge.cpp
// @description JNI 桥接层，把 Kotlin 侧的 runInference / nativeInit / nativeRelease / getLastError / getLastInferenceMetric / calculateSpineAnglesNative 路由到 C++ 实现；处理 byte[] 到 JPEG/PCM-WAV 文件落盘。
//
// [WHO] 定义 JNI 函数 Java_com_catune_*** （nativeInit/nativeRelease/nativeAvailable/getLastError/runInference/getLastInferenceMetric/calculateSpineAnglesNative），全局 `eyes::EyesLlmSession g_session` + `std::string g_last_error`，私有 `writeBytesToFile` / `writePcmAsWav`
// [FROM] 依赖 `jni.h`、`<fstream/mutex/string/vector>`、`eyes_llm_session.h`（EyesLlmSession）、`eyes_log.h`
// [TO] 被 Kotlin 侧 `MnnPerceptionEngine` / `MainActivity` 通过 `external fun` 调用
// [HERE] android/app/src/main/cpp/eyes_mnn_bridge.cpp · JNI 入口
#include <jni.h>

#include <fstream>
#include <mutex>
#include <string>
#include <vector>

#include "eyes_llm_session.h"
#include "eyes_log.h"

namespace {

std::mutex g_mutex;
eyes::EyesLlmSession g_session;
std::string g_cache_dir;
std::string g_last_error;

bool writeBytesToFile(const std::string& path, const jbyte* data, jsize len) {
    if (data == nullptr || len <= 0) return false;
    std::ofstream out(path, std::ios::binary);
    if (!out.is_open()) return false;
    out.write(reinterpret_cast<const char*>(data), len);
    return out.good();
}

bool writePcmAsWav(const std::string& path, const jbyte* pcm, jsize len, jint sample_rate) {
    if (pcm == nullptr || len <= 0 || sample_rate <= 0) return false;
    std::ofstream out(path, std::ios::binary);
    if (!out.is_open()) return false;

    const uint32_t data_size = static_cast<uint32_t>(len);
    const uint32_t file_size = 36 + data_size;
    const uint16_t channels = 1;
    const uint16_t bits_per_sample = 16;
    const uint32_t byte_rate = static_cast<uint32_t>(sample_rate) * channels * bits_per_sample / 8;
    const uint16_t block_align = channels * bits_per_sample / 8;

    out.write("RIFF", 4);
    out.write(reinterpret_cast<const char*>(&file_size), 4);
    out.write("WAVE", 4);
    out.write("fmt ", 4);
    uint32_t fmt_size = 16;
    out.write(reinterpret_cast<const char*>(&fmt_size), 4);
    uint16_t audio_format = 1;
    out.write(reinterpret_cast<const char*>(&audio_format), 2);
    out.write(reinterpret_cast<const char*>(&channels), 2);
    uint32_t sr = static_cast<uint32_t>(sample_rate);
    out.write(reinterpret_cast<const char*>(&sr), 4);
    out.write(reinterpret_cast<const char*>(&byte_rate), 4);
    out.write(reinterpret_cast<const char*>(&block_align), 2);
    out.write(reinterpret_cast<const char*>(&bits_per_sample), 2);
    out.write("data", 4);
    out.write(reinterpret_cast<const char*>(&data_size), 4);
    out.write(reinterpret_cast<const char*>(pcm), len);
    return out.good();
}

std::string jstringToStd(JNIEnv* env, jstring value) {
    if (value == nullptr) return "";
    const char* chars = env->GetStringUTFChars(value, nullptr);
    std::string result(chars ? chars : "");
    env->ReleaseStringUTFChars(value, chars);
    return result;
}

jstring stdToJstring(JNIEnv* env, const std::string& value) {
    return env->NewStringUTF(value.c_str());
}

}  // namespace

extern "C" {

JNIEXPORT jboolean JNICALL
Java_com_catune_inference_mnn_MnnPerceptionEngine_nativeAvailable(JNIEnv*, jclass) {
    std::lock_guard<std::mutex> lock(g_mutex);
    return g_session.isReady() ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jboolean JNICALL
Java_com_catune_inference_mnn_MnnPerceptionEngine_nativeInit(
    JNIEnv* env,
    jclass,
    jstring configPath,
    jstring cacheDir) {
    std::lock_guard<std::mutex> lock(g_mutex);
    const std::string config = jstringToStd(env, configPath);
    g_cache_dir = jstringToStd(env, cacheDir);
    if (config.empty()) {
        g_last_error = "config path is empty";
        return JNI_FALSE;
    }
    if (!g_session.load(config, g_cache_dir)) {
        g_last_error = g_session.lastError();
        return JNI_FALSE;
    }
    g_last_error.clear();
    EYES_LOGD("nativeInit ok: %s", config.c_str());
    return JNI_TRUE;
}

JNIEXPORT void JNICALL
Java_com_catune_inference_mnn_MnnPerceptionEngine_nativeRelease(JNIEnv*, jclass) {
    std::lock_guard<std::mutex> lock(g_mutex);
    g_session.unload();
    g_last_error.clear();
}

JNIEXPORT jstring JNICALL
Java_com_catune_inference_mnn_MnnPerceptionEngine_runInference(
    JNIEnv* env,
    jobject,
    jstring modelPath,
    jbyteArray imageJpeg,
    jbyteArray audioPcm,
    jint sampleRate,
    jstring prompt) {
    std::lock_guard<std::mutex> lock(g_mutex);
    if (!g_session.isReady()) {
        g_last_error = "MNN session not initialized";
        return nullptr;
    }

    const std::string user_prompt = jstringToStd(env, prompt);
    std::string image_path;
    std::string audio_path;

    if (imageJpeg != nullptr) {
        jsize image_len = env->GetArrayLength(imageJpeg);
        if (image_len > 0) {
            jbyte* image_bytes = env->GetByteArrayElements(imageJpeg, nullptr);
            image_path = g_cache_dir + "/eyes_infer.jpg";
            if (!writeBytesToFile(image_path, image_bytes, image_len)) {
                env->ReleaseByteArrayElements(imageJpeg, image_bytes, JNI_ABORT);
                g_last_error = "Failed to write JPEG cache";
                return nullptr;
            }
            env->ReleaseByteArrayElements(imageJpeg, image_bytes, JNI_ABORT);
        }
    }

    if (audioPcm != nullptr) {
        jsize audio_len = env->GetArrayLength(audioPcm);
        if (audio_len > 0) {
            jbyte* audio_bytes = env->GetByteArrayElements(audioPcm, nullptr);
            audio_path = g_cache_dir + "/eyes_infer.wav";
            if (!writePcmAsWav(audio_path, audio_bytes, audio_len, sampleRate)) {
                env->ReleaseByteArrayElements(audioPcm, audio_bytes, JNI_ABORT);
                g_last_error = "Failed to write WAV cache";
                return nullptr;
            }
            env->ReleaseByteArrayElements(audioPcm, audio_bytes, JNI_ABORT);
        }
    }

    const std::string result = g_session.infer(user_prompt, image_path, audio_path);
    if (result.empty()) {
        g_last_error = g_session.lastError().empty() ? "Inference returned empty" : g_session.lastError();
        return nullptr;
    }
    g_last_error.clear();
    return stdToJstring(env, result);
}

JNIEXPORT jstring JNICALL
Java_com_catune_inference_mnn_MnnPerceptionEngine_getLastInferenceMetric(
    JNIEnv* env,
    jobject,
    jstring key) {
    std::lock_guard<std::mutex> lock(g_mutex);
    const std::string metric_key = jstringToStd(env, key);
    const std::string value = g_session.getMetric(metric_key);
    if (value.empty()) return nullptr;
    return stdToJstring(env, value);
}

JNIEXPORT jstring JNICALL
Java_com_catune_inference_mnn_MnnPerceptionEngine_getLastError(JNIEnv* env, jclass) {
    std::lock_guard<std::mutex> lock(g_mutex);
    if (g_last_error.empty()) return nullptr;
    return stdToJstring(env, g_last_error);
}

extern "C" JNIEXPORT jfloatArray JNICALL
Java_com_catune_MainActivity_calculateSpineAnglesNative(JNIEnv* env, jclass clazz, jfloatArray raw_quaternions) {
    // 1. 获取四元数
    jfloat* q = env->GetFloatArrayElements(raw_quaternions, NULL);

    // 2. 模拟计算
    float neck_pitch = 15.0f + (rand() % 100 / 100.0f);
    float lumbar_roll = 5.0f + (rand() % 100 / 100.0f);

    // 3. 返回结果
    jfloatArray result = env->NewFloatArray(2);
    jfloat angles[2] = {neck_pitch, lumbar_roll};
    env->SetFloatArrayRegion(result, 0, 2, angles);

    env->ReleaseFloatArrayElements(raw_quaternions, q, 0);
    return result;
}

}
