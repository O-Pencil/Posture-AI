/**
 * @file MnnDebugModule.kt
 * @description RN debug bridge for local MNN text inference status and smoke tests.
 *
 * [WHO] Exports `CatuneMnn.getStatus()` and `CatuneMnn.inferText(prompt)` to JS.
 * [FROM] Depends on `MnnPerceptionEngine` / `InferenceExecutor` and React Native bridge APIs.
 * [TO] Used by Settings MNN DEBUG card before the model path is wired into the posture engine.
 * [HERE] android/app/src/main/java/com/catune/rn/MnnDebugModule.kt - temporary MNN debug module.
 */
package com.catune.rn

import com.catune.inference.mnn.InferenceExecutor
import com.catune.inference.mnn.MnnPerceptionEngine
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.io.File

class MnnDebugModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun getName(): String = "CatuneMnn"

    @ReactMethod
    fun getStatus(promise: Promise) {
        scope.launch {
            try {
                val modelDir = File(reactContext.filesDir, "mnn_models/qwen3-1.7b")
                MnnPerceptionEngine.loadNativeLibs()
                val status = Arguments.createMap().apply {
                    putBoolean("nativeLibLoaded", MnnPerceptionEngine.isNativeLibLoaded())
                    putBoolean("modelDirExists", modelDir.exists())
                    putBoolean("configExists", File(modelDir, "config.json").exists())
                    putBoolean("modelLoaded", InferenceExecutor.isModelLoaded())
                    putString("modelDir", modelDir.absolutePath)
                    putString("loadError", InferenceExecutor.loadError())
                }
                promise.resolve(status)
            } catch (error: Throwable) {
                promise.reject("CATUNE_MNN_STATUS_FAILED", error.message, error)
            }
        }
    }

    @ReactMethod
    fun inferText(prompt: String, promise: Promise) {
        scope.launch {
            try {
                val loaded = InferenceExecutor.ensureModelLoaded(reactContext)
                if (!loaded) {
                    promise.reject(
                        "CATUNE_MNN_MODEL_NOT_READY",
                        InferenceExecutor.loadError() ?: "MNN model is not ready",
                    )
                    return@launch
                }

                val engine = MnnPerceptionEngine.tryCreate(reactContext)
                val result = engine?.inferText(prompt)
                if (result == null) {
                    promise.reject("CATUNE_MNN_INFER_FAILED", MnnPerceptionEngine.getLastError())
                    return@launch
                }

                val metrics = Arguments.createMap().apply {
                    putDouble("ttftMs", result.metrics.ttftMs.toDouble())
                    putDouble("prefillMs", result.metrics.prefillMs.toDouble())
                    putDouble("decodeMs", result.metrics.decodeMs.toDouble())
                    putInt("tokensGenerated", result.metrics.tokensGenerated)
                    putDouble("decodeTps", result.metrics.decodeTps.toDouble())
                    putString("backend", result.metrics.backend)
                }
                val response = Arguments.createMap().apply {
                    putString("rawOutput", result.rawOutput)
                    putDouble("inferenceMs", result.inferenceMs.toDouble())
                    putMap("metrics", metrics)
                }
                promise.resolve(response)
            } catch (error: Throwable) {
                promise.reject("CATUNE_MNN_INFER_EXCEPTION", error.message, error)
            }
        }
    }
}
