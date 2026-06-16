/**
 * @file MnnDebugModule.kt
 * @description RN debug bridge for local MNN text inference status and smoke tests.
 *
 * [WHO] Exports `CatuneMnn.getStatus()` / `inferText()` / `inferTextStream()` / `runBenchmark()` to JS.
 * [FROM] Depends on `MnnPerceptionEngine` / `InferenceExecutor` and React Native bridge APIs.
 * [TO] Used by Settings MNN DEBUG card before the model path is wired into the posture engine.
 * [HERE] android/app/src/main/java/com/catune/rn/MnnDebugModule.kt - temporary MNN debug module.
 */
package com.catune.rn

import com.catune.inference.mnn.InferenceExecutor
import com.catune.inference.mnn.MnnModelPaths
import com.catune.inference.mnn.MnnPerceptionEngine
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File

class MnnDebugModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun getName(): String = "CatuneMnn"

    private fun putCpuInfo(target: com.facebook.react.bridge.WritableMap) {
        val cpu = MnnPerceptionEngine.getCpuInfoMap()
        val cpuMap = Arguments.createMap()
        cpuMap.putBoolean("probeOk", cpu["probeOk"] as? Boolean ?: false)
        cpuMap.putBoolean("fp16", cpu["fp16"] as? Boolean ?: false)
        cpuMap.putBoolean("dot", cpu["dot"] as? Boolean ?: false)
        cpuMap.putBoolean("i8mm", cpu["i8mm"] as? Boolean ?: false)
        cpuMap.putBoolean("sve2", cpu["sve2"] as? Boolean ?: false)
        cpuMap.putBoolean("sme2Hw", cpu["sme2Hw"] as? Boolean ?: false)
        cpuMap.putBoolean("libSme2", cpu["libSme2"] as? Boolean ?: false)
        cpuMap.putString("backend", cpu["backend"] as? String ?: "unknown")
        cpuMap.putString("readiness", cpu["readiness"] as? String ?: "unknown")
        target.putMap("cpu", cpuMap)
    }

    private fun metricsMap(result: com.catune.inference.mnn.MnnTextResult): com.facebook.react.bridge.WritableMap =
        Arguments.createMap().apply {
            putDouble("ttftMs", result.metrics.ttftMs.toDouble())
            putDouble("prefillMs", result.metrics.prefillMs.toDouble())
            putDouble("decodeMs", result.metrics.decodeMs.toDouble())
            putInt("tokensGenerated", result.metrics.tokensGenerated)
            putDouble("decodeTps", result.metrics.decodeTps.toDouble())
            putString("backend", result.metrics.backend)
        }

    private fun sendEvent(name: String, payload: WritableMap = Arguments.createMap()) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, payload)
    }

    /** Required by RN NativeEventEmitter on Android. */
    @ReactMethod
    fun addListener(eventName: String) = Unit

    /** Required by RN NativeEventEmitter on Android. */
    @ReactMethod
    fun removeListeners(count: Int) = Unit

    @ReactMethod
    fun getStatus(promise: Promise) {
        scope.launch {
            try {
                InferenceExecutor.resetLoadFailure()
                val modelDir = MnnModelPaths.resolveModelDir(reactContext)
                MnnPerceptionEngine.loadNativeLibs()
                val status = Arguments.createMap().apply {
                    putBoolean("nativeLibLoaded", MnnPerceptionEngine.isNativeLibLoaded())
                    putBoolean("modelDirExists", modelDir.exists())
                    putBoolean("configExists", File(modelDir, "config.json").exists())
                    putBoolean("modelLoaded", InferenceExecutor.isModelLoaded())
                    putString("modelDir", modelDir.absolutePath)
                    putString("activeModelId", MnnModelPaths.resolveActiveModelId(reactContext))
                    putString("loadError", InferenceExecutor.loadError())
                    putCpuInfo(this)
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
                InferenceExecutor.resetLoadFailure()
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

                val response = Arguments.createMap().apply {
                    putString("rawOutput", result.rawOutput)
                    putDouble("inferenceMs", result.inferenceMs.toDouble())
                    putMap("metrics", metricsMap(result))
                }
                promise.resolve(response)
            } catch (error: Throwable) {
                promise.reject("CATUNE_MNN_INFER_EXCEPTION", error.message, error)
            }
        }
    }

    @ReactMethod
    fun inferTextStream(prompt: String, promise: Promise) {
        scope.launch {
            try {
                InferenceExecutor.resetLoadFailure()
                val loaded = InferenceExecutor.ensureModelLoaded(reactContext)
                if (!loaded) {
                    val message = InferenceExecutor.loadError() ?: "MNN model is not ready"
                    sendEvent("onMnnError", Arguments.createMap().apply { putString("error", message) })
                    promise.reject("CATUNE_MNN_MODEL_NOT_READY", message)
                    return@launch
                }

                val engine = MnnPerceptionEngine.tryCreate(reactContext)
                if (engine == null) {
                    val message = "Engine unavailable"
                    sendEvent("onMnnError", Arguments.createMap().apply { putString("error", message) })
                    promise.reject("CATUNE_MNN_INFER_FAILED", message)
                    return@launch
                }

                var rawOutput: String? = null
                var inferError: Throwable? = null
                val inferJob = launch {
                    try {
                        rawOutput = engine.inferText(prompt)?.rawOutput
                    } catch (error: Throwable) {
                        inferError = error
                    }
                }

                var emitted = ""
                val pollJob = launch {
                    while (isActive && inferJob.isActive) {
                        delay(120)
                        val partial = MnnPerceptionEngine.getPartialOutput()
                        if (partial.length > emitted.length) {
                            val token = partial.substring(emitted.length)
                            emitted = partial
                            sendEvent("onMnnToken", Arguments.createMap().apply { putString("token", token) })
                        }
                    }
                }

                inferJob.join()
                pollJob.cancelAndJoin()

                inferError?.let { throw it }
                val full = rawOutput
                if (full.isNullOrEmpty()) {
                    val message = MnnPerceptionEngine.getLastError() ?: "Inference returned empty"
                    sendEvent("onMnnError", Arguments.createMap().apply { putString("error", message) })
                    promise.reject("CATUNE_MNN_INFER_FAILED", message)
                    return@launch
                }

                if (full.length > emitted.length) {
                    sendEvent(
                        "onMnnToken",
                        Arguments.createMap().apply { putString("token", full.substring(emitted.length)) },
                    )
                }
                sendEvent("onMnnDone")
                promise.resolve(null)
            } catch (error: Throwable) {
                val message = error.message ?: "infer stream exception"
                sendEvent("onMnnError", Arguments.createMap().apply { putString("error", message) })
                promise.reject("CATUNE_MNN_INFER_EXCEPTION", message, error)
            }
        }
    }

    /** Warm-up + 2 timed runs for SME2/NEON demo on real device. */
    @ReactMethod
    fun runBenchmark(prompt: String, promise: Promise) {
        scope.launch {
            try {
                InferenceExecutor.resetLoadFailure()
                val loaded = InferenceExecutor.ensureModelLoaded(reactContext)
                if (!loaded) {
                    promise.reject(
                        "CATUNE_MNN_MODEL_NOT_READY",
                        InferenceExecutor.loadError() ?: "MNN model is not ready",
                    )
                    return@launch
                }
                val engine = MnnPerceptionEngine.tryCreate(reactContext) ?: run {
                    promise.reject("CATUNE_MNN_INFER_FAILED", "Engine unavailable")
                    return@launch
                }

                val runs = Arguments.createArray()
                var totalTps = 0.0
                var success = 0
                repeat(3) { idx ->
                    val result = engine.inferText(prompt)
                    if (result == null) {
                        if (idx == 0) {
                            promise.reject("CATUNE_MNN_BENCH_FAILED", MnnPerceptionEngine.getLastError())
                            return@launch
                        }
                        return@repeat
                    }
                    val row = Arguments.createMap().apply {
                        putInt("run", idx + 1)
                        putString("label", if (idx == 0) "warmup" else "timed")
                        putDouble("inferenceMs", result.inferenceMs.toDouble())
                        putMap("metrics", metricsMap(result))
                        putString("rawOutput", result.rawOutput)
                    }
                    runs.pushMap(row)
                    if (idx > 0) {
                        totalTps += result.metrics.decodeTps
                        success += 1
                    }
                }

                val cpu = MnnPerceptionEngine.getCpuInfoMap()
                val summary = Arguments.createMap().apply {
                    putDouble("avgDecodeTps", if (success > 0) totalTps / success else 0.0)
                    putString("backend", cpu["backend"] as? String ?: "unknown")
                    putString("readiness", cpu["readiness"] as? String ?: "unknown")
                    putBoolean("sme2Hw", cpu["sme2Hw"] as? Boolean ?: false)
                    putBoolean("libSme2", cpu["libSme2"] as? Boolean ?: false)
                }

                promise.resolve(
                    Arguments.createMap().apply {
                        putArray("runs", runs)
                        putMap("summary", summary)
                    },
                )
            } catch (error: Throwable) {
                promise.reject("CATUNE_MNN_BENCH_EXCEPTION", error.message, error)
            }
        }
    }

    /** 卸载已加载模型（切换/删除模型后由 JS 调用，下次 infer 会按 .active 重载）。 */
    @ReactMethod
    fun releaseModel(promise: Promise) {
        scope.launch {
            try {
                InferenceExecutor.release()
                promise.resolve(true)
            } catch (error: Throwable) {
                promise.reject("CATUNE_MNN_RELEASE_FAILED", error.message, error)
            }
        }
    }
}
