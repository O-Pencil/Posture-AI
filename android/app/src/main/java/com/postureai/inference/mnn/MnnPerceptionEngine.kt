/**
 * @file MnnPerceptionEngine.kt
 * @description Kotlin ↔ MNN JNI 桥接，把 JPEG/PCM/Prompt 喂给 libeyes_mnn_bridge 并解析返回的 VL 输出。
 *
 * [WHO] 提供 `class MnnPerceptionEngine`、`analyze(imageJpeg, audioPcm, sampleRate, systemPrompt, onDecoding): MnnAnalyzeResult?`、`analyzeWatchdog(jpeg, systemPrompt, alertRules): WatchdogAnalysis?`、`data class InferenceMetrics` / `MnnAnalyzeResult`；伴生对象 `tryCreate()` / `isNativeLibLoaded()` / `loadNativeLibs()` / `isModelDirReady()` / `nativeInit/Release/Available/getLastError`
 * [FROM] 依赖 `InferenceExecutor.run`（单线程调度）、JNI `runInference` / `getLastInferenceMetric` / `nativeInit/Release`、libMNN + libeyes_mnn_bridge
 * [TO] 被 `DefaultPerceptionEngine` 持有；JNI 错误会触发降级到 `HeuristicAnalyzer`
 * [HERE] android/app/src/main/java/com/catune/inference/mnn/MnnPerceptionEngine.kt · MNN 推理 Kotlin/JNI 桥
 */
package com.catune.inference.mnn

import android.content.Context
import com.catune.inference.PerceptionResult
import com.catune.inference.WatchdogAnalysis
import java.io.File

data class InferenceMetrics(
    val ttftMs: Long,
    val prefillMs: Long,
    val decodeMs: Long,
    val tokensGenerated: Int,
    val decodeTps: Float,
    val backend: String = "unknown",
)

data class MnnAnalyzeResult(
    val result: PerceptionResult,
    val metrics: InferenceMetrics,
    val rawOutput: String,
)

/**
 * Bridge to Alibaba MNN / Qwen3-VL on-device inference.
 *
 * Model weights: filesDir/mnn_models/qwen3-vl-2b/
 * Native lib: jniLibs/arm64-v8a/libMNN.so + eyes_mnn_bridge
 */
class MnnPerceptionEngine private constructor(
    private val modelDir: File,
) {
    val isLoaded: Boolean
        get() = modelDir.exists() &&
            File(modelDir, "config.json").exists() &&
            InferenceExecutor.isModelLoaded()

    suspend fun analyze(
        imageJpeg: ByteArray?,
        audioPcm: ByteArray?,
        sampleRate: Int,
        systemPrompt: String,
        onDecoding: () -> Unit = {},
    ): MnnAnalyzeResult? {
        if (!isLoaded) return null
        val start = System.currentTimeMillis()
        val raw = InferenceExecutor.run {
            runInference(
                modelPath = File(modelDir, "config.json").absolutePath,
                imageJpeg = imageJpeg,
                audioPcm = audioPcm,
                sampleRate = sampleRate,
                prompt = systemPrompt,
            )
        } ?: return null
        onDecoding()
        val totalMs = System.currentTimeMillis() - start
        val parsed = ModelOutputParser.parse(raw)
        val tokens: Int = readMetricLong("tokens_generated")?.toInt() ?: estimateTokenCount(raw)
        val ttft = readMetricLong("ttft_ms") ?: (totalMs * 0.35).toLong().coerceAtLeast(1L)
        val prefill = readMetricLong("prefill_ms") ?: ttft.coerceAtMost(totalMs)
        val decode = readMetricLong("decode_ms") ?: (totalMs - prefill).coerceAtLeast(0L)
        val tps = readMetricFloat("decode_tps")
            ?: if (decode > 0L) tokens * 1000f / decode.toFloat() else 0f
        val backend = readNativeMetric("backend") ?: "unknown"
        val metrics = InferenceMetrics(
            ttftMs = ttft,
            prefillMs = prefill,
            decodeMs = decode,
            tokensGenerated = tokens,
            decodeTps = tps,
            backend = backend,
        )
        return MnnAnalyzeResult(
            result = PerceptionResult(
                summary = parsed.summary,
                structured = parsed.structured,
                inferenceMs = totalMs,
                degradedMode = false,
                modelLoaded = true,
                rawModelOutput = raw,
                parseWarning = parsed.parseWarning,
            ),
            metrics = metrics,
            rawOutput = raw,
        )
    }

    private fun estimateTokenCount(text: String): Int = (text.length / 4).coerceAtLeast(1)

    private fun readMetricLong(key: String): Long? = readNativeMetric(key)?.toLongOrNull()

    private fun readMetricFloat(key: String): Float? = readNativeMetric(key)?.toFloatOrNull()

    private fun readNativeMetric(key: String): String? = try {
        getLastInferenceMetric(key)
    } catch (_: UnsatisfiedLinkError) {
        null
    }

    suspend fun analyzeWatchdog(
        jpeg: ByteArray,
        systemPrompt: String,
        alertRules: String?,
    ): WatchdogAnalysis? {
        if (!isLoaded) return null
        val prompt = "$systemPrompt\nWatch rules: ${alertRules ?: "any anomaly"}"
        val raw = InferenceExecutor.run {
            runInference(
                File(modelDir, "config.json").absolutePath,
                jpeg,
                null,
                16000,
                prompt,
            )
        } ?: return null
        val parsed = ModelOutputParser.parse(raw)
        val anomaly = parsed.structured.anomalies.isNotEmpty()
        return WatchdogAnalysis(
            summary = parsed.summary,
            structured = parsed.structured,
            anomalyDetected = anomaly,
            alertKey = parsed.structured.anomalies.firstOrNull(),
            inferenceMs = 0,
        )
    }

    private external fun runInference(
        modelPath: String,
        imageJpeg: ByteArray?,
        audioPcm: ByteArray?,
        sampleRate: Int,
        prompt: String,
    ): String?

    private external fun getLastInferenceMetric(key: String): String?

    companion object {
        private var mnnLibLoaded = false
        private var bridgeLibLoaded = false

        @JvmStatic
        private external fun nativeAvailable(): Boolean

        @JvmStatic
        external fun nativeInit(configPath: String, cacheDir: String): Boolean

        @JvmStatic
        external fun nativeRelease()

        @JvmStatic
        external fun getLastError(): String?

        fun tryCreate(context: Context): MnnPerceptionEngine? {
            val modelDir = File(context.filesDir, "mnn_models/qwen3-vl-2b")
            if (!modelDir.exists()) modelDir.mkdirs()
            loadNativeLibs()
            return MnnPerceptionEngine(modelDir)
        }

        fun isNativeLibLoaded(): Boolean {
            loadNativeLibs()
            return mnnLibLoaded && bridgeLibLoaded
        }

        fun isModelDirReady(dir: File): Boolean =
            dir.exists() &&
                File(dir, "config.json").exists() &&
                isNativeLibLoaded() &&
                (InferenceExecutor.isModelLoaded() || nativeAvailable())

        fun loadNativeLibs() {
            if (!mnnLibLoaded) {
                try {
                    System.loadLibrary("MNN")
                    mnnLibLoaded = true
                } catch (_: UnsatisfiedLinkError) {
                    mnnLibLoaded = false
                }
            }
            if (!bridgeLibLoaded) {
                try {
                    System.loadLibrary("posture_ai_bridge")
                    bridgeLibLoaded = true
                } catch (_: UnsatisfiedLinkError) {
                    bridgeLibLoaded = false
                }
            }
        }
    }
}
