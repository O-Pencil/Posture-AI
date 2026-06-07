/**
 * @file ModelInstallInfo.kt
 * @description 扫描 filesDir 中 MNN 权重目录，生成 ModelInstallState 给 UI 展示（就绪/缺权重/JNI 缺失等）。
 *
 * [WHO] 提供 `data class ModelInstallState`（含 `statusLabel`）、`object ModelInstallChecker.from(context): ModelInstallState`
 * [FROM] 依赖 `MnnPerceptionEngine.isNativeLibLoaded()`、`InferenceExecutor.isModelLoaded()`、`MnnPerceptionEngine.isModelDirReady()`、`File.listFiles()`
 * [TO] 被 Compose UI `ModelStatusCard` 渲染；被 `ServiceRuntime.buildStatus()` 间接消费
 * [HERE] android/app/src/main/java/com/catune/inference/ModelInstallInfo.kt · 模型安装状态探测器
 */
package com.catune.inference

import android.content.Context
import com.catune.inference.mnn.MnnPerceptionEngine
import java.io.File

data class ModelInstallState(
    val modelDir: String,
    val weightsPresent: Boolean,
    val fileCount: Int,
    val totalSizeMb: Float,
    val nativeLibLoaded: Boolean,
    val readyForInference: Boolean,
    val checking: Boolean = false,
) {
    val statusLabel: String = when {
        checking -> "Checking model files�?
        readyForInference -> "Ready (Qwen3-VL)"
        weightsPresent && nativeLibLoaded && !readyForInference ->
            "Weights OK · loading MNN (${com.catune.inference.mnn.InferenceExecutor.loadError() ?: "init�?})"
        weightsPresent && !readyForInference -> "Weights OK · MNN inference not wired yet"
        weightsPresent && !nativeLibLoaded -> "Weights found · JNI library missing"
        weightsPresent -> "Weights found"
        else -> "Not installed (heuristic mode)"
    }

    companion object {
        fun loading() = ModelInstallState(
            modelDir = "",
            weightsPresent = false,
            fileCount = 0,
            totalSizeMb = 0f,
            nativeLibLoaded = false,
            readyForInference = false,
            checking = true,
        )
    }
}

object ModelInstallChecker {
    private const val MODEL_SUBDIR = "mnn_models/qwen3-vl-2b"
    private val REQUIRED_FILES = listOf(
        "config.json",
        "llm.mnn",
        "llm.mnn.weight",
        "visual.mnn",
        "visual.mnn.weight",
    )

    fun from(context: Context): ModelInstallState {
        val dir = File(context.filesDir, MODEL_SUBDIR)
        if (!dir.exists()) dir.mkdirs()

        var fileCount = 0
        var totalBytes = 0L
        dir.listFiles()?.forEach { f ->
            if (f.isFile) {
                fileCount++
                totalBytes += f.length()
            }
        }

        val weightsPresent = hasRequiredModelFiles(dir)
        val nativeLoaded = MnnPerceptionEngine.isNativeLibLoaded()
        val inferenceReady = weightsPresent &&
            nativeLoaded &&
            (com.catune.inference.mnn.InferenceExecutor.isModelLoaded() ||
                MnnPerceptionEngine.isModelDirReady(dir))
        return ModelInstallState(
            modelDir = dir.absolutePath,
            weightsPresent = weightsPresent,
            fileCount = fileCount,
            totalSizeMb = totalBytes / (1024f * 1024f),
            nativeLibLoaded = nativeLoaded,
            readyForInference = inferenceReady,
        )
    }

    private fun hasRequiredModelFiles(dir: File): Boolean =
        REQUIRED_FILES.all { name -> File(dir, name).isFile && File(dir, name).length() > 0L }
}
