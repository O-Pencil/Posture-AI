/**
 * @file InferenceExecutor.kt
 * @description MNN 加载/推理的单线程串行化执行器，避免 native 侧状态竞争。
 *
 * [WHO] 提供 `object InferenceExecutor`（`run(block)` 调度、`isModelLoaded()`、`loadError()`、`ensureModelLoaded(context)` 幂等加载、`release()`）
 * [FROM] 依赖 `Executors.newSingleThreadExecutor` + `asCoroutineDispatcher`、JNI `MnnPerceptionEngine.nativeInit/nativeRelease/getLastError`、`AtomicBoolean`
 * [TO] 被 `MnnPerceptionEngine.analyze()` 调度推理；被 `DefaultPerceptionEngine.ensureModelLoaded()` 启动预加载；被 `ServiceRuntime.buildStatus()` 读取 loadError
 * [HERE] android/app/src/main/java/com/catune/inference/mnn/InferenceExecutor.kt · MNN 推理单线程调度
 */
package com.catune.inference.mnn

import android.content.Context
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.withContext
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Serializes native MNN load/infer on a single background thread.
 */
object InferenceExecutor {
    private val dispatcher = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "eyes-mnn-infer").apply { isDaemon = true }
    }.asCoroutineDispatcher()

    private val modelLoaded = AtomicBoolean(false)
    private val loadFailed = AtomicBoolean(false)
    @Volatile
    private var loadError: String? = null

    suspend fun <T> run(block: suspend () -> T): T = withContext(dispatcher) { block() }

    fun isModelLoaded(): Boolean = modelLoaded.get()

    fun loadError(): String? = loadError

    suspend fun ensureModelLoaded(context: Context): Boolean = run {
        if (modelLoaded.get()) return@run true
        if (loadFailed.get()) return@run false

        val modelDir = File(context.filesDir, "mnn_models/qwen3-vl-2b")
        val configFile = File(modelDir, "config.json")
        if (!configFile.exists()) {
            loadError = "config.json not found in ${modelDir.absolutePath}"
            loadFailed.set(true)
            return@run false
        }

        MnnPerceptionEngine.loadNativeLibs()
        if (!MnnPerceptionEngine.isNativeLibLoaded()) {
            loadError = "Native libraries failed to load"
            loadFailed.set(true)
            return@run false
        }

        val cacheDir = File(context.cacheDir, "mnn_infer").apply { mkdirs() }
        val ok = MnnPerceptionEngine.nativeInit(configFile.absolutePath, cacheDir.absolutePath)
        if (!ok) {
            loadError = MnnPerceptionEngine.getLastError() ?: "nativeInit failed"
            loadFailed.set(true)
            return@run false
        }

        modelLoaded.set(true)
        loadError = null
        true
    }

    suspend fun release() = run {
        if (!modelLoaded.get()) return@run
        MnnPerceptionEngine.nativeRelease()
        modelLoaded.set(false)
        loadFailed.set(false)
        loadError = null
    }
}
