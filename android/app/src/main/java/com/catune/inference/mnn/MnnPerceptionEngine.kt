/**
 * @file MnnPerceptionEngine.kt
 * @description Kotlin ↔ MNN JNI 桥接，把 Prompt（可选 JPEG/PCM）喂给 libposture_ai_bridge 并解析返回文本。
 *
 * 注：源自 eyes-on-my-phone 的多模态 VL 引擎，恢复后用于端侧 Qwen 推理。当前为「已恢复、待接线」组件，
 * 业务逻辑（状态机/判定/建议）已迁到 TS（src/posture），本类未来仅作为 RN 的「inferText 原生服务」。
 * 接入：注册一个暴露 `inferText(prompt)` 的 RN 模块，由 TS 引擎调用；详见 docs/端侧模型对接计划.md。
 * 姿态用途只需文本路径：`inferText(prompt)` / `analyze(null, null, 0, prompt)`。
 *
 * [WHO] 提供 `class MnnPerceptionEngine`、`analyze(imageJpeg, audioPcm, sampleRate, systemPrompt, onDecoding): MnnAnalyzeResult?`、`data class InferenceMetrics` / `MnnAnalyzeResult`；伴生对象 `tryCreate()` / `isNativeLibLoaded()` / `loadNativeLibs()` / `isModelDirReady()` / `nativeInit/Release/Available/getLastError`
 * [FROM] 依赖 `InferenceExecutor.run`（单线程调度）、JNI `runInference` / `getLastInferenceMetric` / `nativeInit/Release`、libMNN + libposture_ai_bridge
 * [TO] 待接入：姿态文案生成模块（输入角度 Prompt → 输出建议）。JNI 缺失/超时时由调用方回退规则引擎
 * [HERE] android/app/src/main/java/com/catune/inference/mnn/MnnPerceptionEngine.kt · MNN 推理 Kotlin/JNI 桥
 */
package com.catune.inference.mnn

import android.content.Context
import com.catune.inference.PerceptionResult
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

/** 纯文本推理结果（姿态文案等用途）。 */
data class MnnTextResult(
    val rawOutput: String,
    val inferenceMs: Long,
    val metrics: InferenceMetrics,
)

/**
 * Bridge to Alibaba MNN / Qwen3-VL on-device inference.
 *
 * Model weights: filesDir/mnn_models/qwen3-1.7b/
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

    /**
     * 纯文本推理路径（无图像/音频），供姿态文案生成等场景使用。
     * 返回模型原始输出 + 推理指标；模型未加载或推理失败时返回 null（调用方应回退规则）。
     */
    suspend fun inferText(prompt: String): MnnTextResult? {
        if (!isLoaded) return null
        val start = System.currentTimeMillis()
        val raw = InferenceExecutor.run {
            runInference(
                modelPath = File(modelDir, "config.json").absolutePath,
                imageJpeg = null,
                audioPcm = null,
                sampleRate = 0,
                prompt = prompt,
            )
        } ?: return null
        val totalMs = System.currentTimeMillis() - start
        val tokens = readMetricLong("tokens_generated")?.toInt() ?: estimateTokenCount(raw)
        val ttft = readMetricLong("ttft_ms") ?: (totalMs * 0.35).toLong().coerceAtLeast(1L)
        val prefill = readMetricLong("prefill_ms") ?: ttft.coerceAtMost(totalMs)
        val decode = readMetricLong("decode_ms") ?: (totalMs - prefill).coerceAtLeast(0L)
        val tps = readMetricFloat("decode_tps")
            ?: if (decode > 0L) tokens * 1000f / decode.toFloat() else 0f
        return MnnTextResult(
            rawOutput = raw,
            inferenceMs = totalMs,
            metrics = InferenceMetrics(
                ttftMs = ttft,
                prefillMs = prefill,
                decodeMs = decode,
                tokensGenerated = tokens,
                decodeTps = tps,
                backend = readNativeMetric("backend") ?: "unknown",
            ),
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
            val modelDir = File(context.filesDir, "mnn_models/qwen3-1.7b")
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
