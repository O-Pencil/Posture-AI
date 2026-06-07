/**
 * @file DefaultPerceptionEngine.kt
 * @description PerceptionEngine 默认实现：捕获摄像头/音频 → 调 MNN 推理 → 失败回退 HeuristicAnalyzer，并推送 InferenceStatusHub 状态。
 *
 * [WHO] 提供 `class DefaultPerceptionEngine(perceptionEngine)`、`analyze(PerceptionRequest)` / `lookRaw(String)` / `analyzeWatchdogFrame(JPEG, prompt, rules)`、`buildSystemPrompt(userPrompt)`、`loadAssetPrompt(path)`
 * [FROM] 依赖 `CameraCaptureManager`、`AudioCaptureManager`、`MnnPerceptionEngine`（尝试加载）、`HeuristicAnalyzer`（降级）、`InferenceStatusHub`、assets 资源 `prompts/safety_prefix.txt` + `prompts/vl_system.txt`
 * [TO] 被 `ServiceRuntime.perceptionEngine` 实例化；被 `McpRequestHandler` 在 `phone_look/listen/perceive/look_raw/watch_*` 路径调用
 * [HERE] android/app/src/main/java/com/catune/inference/DefaultPerceptionEngine.kt · 推理编排器（含启发式降级）
 */
package com.catune.inference

import android.content.Context
import android.util.Base64
import com.catune.capture.AudioCaptureManager
import com.catune.capture.CameraCaptureManager
import com.catune.inference.mnn.InferenceExecutor
import com.catune.inference.mnn.MnnPerceptionEngine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import java.io.BufferedReader
import java.io.InputStreamReader

class DefaultPerceptionEngine(
    private val context: Context,
    private val cameraCaptureManager: CameraCaptureManager,
    private val audioCaptureManager: AudioCaptureManager,
) : PerceptionEngine {

    private val mnnEngine: MnnPerceptionEngine? = MnnPerceptionEngine.tryCreate(context)

    init {
        CoroutineScope(Dispatchers.IO).launch {
            InferenceExecutor.ensureModelLoaded(context)
        }
    }

    override val isModelLoaded: Boolean
        get() = mnnEngine != null && InferenceExecutor.isModelLoaded()
    override var lastInferenceMs: Long = 0
        private set

    private val safetyPrefix: String by lazy { loadAssetPrompt("prompts/safety_prefix.txt") }
    private val vlSystemPrompt: String by lazy { loadAssetPrompt("prompts/vl_system.txt") }

    override fun analyze(request: PerceptionRequest): PerceptionResult {
        val start = System.currentTimeMillis()
        return runBlocking {
            try {
                InferenceExecutor.ensureModelLoaded(context)
                InferenceStatusHub.onCapturing(
                    when (request.mode) {
                        PerceptionRequest.Mode.LISTEN -> "Recording audio buffer"
                        PerceptionRequest.Mode.PERCEIVE -> "Capturing frame + audio"
                        else -> "Capturing camera frame"
                    },
                )
                val imageBytes = when (request.mode) {
                    PerceptionRequest.Mode.LISTEN -> null
                    else -> cameraCaptureManager.captureFrame()
                }
                val audioPcm = when (request.mode) {
                    PerceptionRequest.Mode.LOOK -> null
                    else -> audioCaptureManager.sliceRecentPcm(request.audioDurationSec)
                }

                val mnnResult = if (isModelLoaded) {
                    InferenceStatusHub.onPrefill()
                    mnnEngine?.analyze(
                        imageJpeg = imageBytes,
                        audioPcm = audioPcm,
                        sampleRate = audioCaptureManager.getSampleRate(),
                        systemPrompt = buildSystemPrompt(request.prompt),
                        onDecoding = { InferenceStatusHub.onDecoding() },
                    )
                } else {
                    null
                }

                lastInferenceMs = System.currentTimeMillis() - start

                if (mnnResult != null) {
                    val metrics = mnnResult.metrics
                    InferenceStatusHub.onComplete(
                        ttftMs = metrics.ttftMs,
                        prefillMs = metrics.prefillMs,
                        decodeMs = metrics.decodeMs,
                        tokensGenerated = metrics.tokensGenerated,
                        decodeTps = metrics.decodeTps,
                        totalMs = lastInferenceMs,
                        heuristic = false,
                        backend = metrics.backend,
                        rawOutput = mnnResult.rawOutput,
                    )
                    return@runBlocking mnnResult.result.copy(
                        capturedAtMs = System.currentTimeMillis(),
                        inferenceMs = lastInferenceMs,
                        thumbnailBase64 = if (request.includeThumbnail && imageBytes != null) {
                            Base64.encodeToString(imageBytes, Base64.NO_WRAP)
                        } else null,
                    )
                }

                buildHeuristicResult(request, imageBytes, audioPcm, start)
            } catch (e: Exception) {
                InferenceStatusHub.onError(e.message ?: "Inference failed")
                throw e
            }
        }
    }

    override fun lookRaw(prompt: String): RawLookResult = runBlocking {
        val jpeg = cameraCaptureManager.captureFrame()
        RawLookResult(
            prompt = prompt,
            thumbnailBase64 = Base64.encodeToString(jpeg, Base64.NO_WRAP),
            degradedMode = true,
            message = "VL model not loaded. Use thumbnail for cloud analysis or install Qwen3-VL MNN weights.",
        )
    }

    override fun analyzeWatchdogFrame(jpeg: ByteArray, prompt: String, alertRules: String?): WatchdogAnalysis {
        val start = System.currentTimeMillis()
        val mnn = runBlocking {
            InferenceExecutor.ensureModelLoaded(context)
            mnnEngine?.analyzeWatchdog(jpeg, buildSystemPrompt(prompt), alertRules)
        }
        lastInferenceMs = System.currentTimeMillis() - start
        if (mnn != null) return mnn.copy(inferenceMs = lastInferenceMs)

        val heuristic = HeuristicAnalyzer.analyze(jpeg, prompt, alertRules)
        return WatchdogAnalysis(
            summary = heuristic.summary,
            structured = heuristic.structured,
            anomalyDetected = heuristic.anomalyDetected,
            alertKey = heuristic.alertKey,
            inferenceMs = lastInferenceMs,
        )
    }

    private fun buildHeuristicResult(
        request: PerceptionRequest,
        imageBytes: ByteArray?,
        audioPcm: ByteArray?,
        startMs: Long,
    ): PerceptionResult {
        val heuristic = when (request.mode) {
            PerceptionRequest.Mode.LOOK -> {
                requireNotNull(imageBytes)
                HeuristicAnalyzer.analyze(imageBytes, request.prompt, null)
            }
            PerceptionRequest.Mode.LISTEN -> {
                HeuristicAnalyzer.analyzeAudio(audioPcm ?: ByteArray(0), request.prompt)
            }
            PerceptionRequest.Mode.PERCEIVE -> {
                HeuristicAnalyzer.analyze(
                    imageBytes ?: ByteArray(0),
                    request.prompt,
                    null,
                    hasAudio = (audioPcm?.size ?: 0) > 0,
                )
            }
        }
        lastInferenceMs = System.currentTimeMillis() - startMs
        InferenceStatusHub.onComplete(
            ttftMs = lastInferenceMs,
            prefillMs = null,
            decodeMs = null,
            tokensGenerated = 0,
            decodeTps = null,
            totalMs = lastInferenceMs,
            heuristic = true,
        )
        return PerceptionResult(
            summary = heuristic.summary + " [degraded_mode: heuristic; install MNN Qwen3-VL for full VL]",
            structured = heuristic.structured,
            capturedAtMs = System.currentTimeMillis(),
            inferenceMs = lastInferenceMs,
            transcriptHint = if (request.mode != PerceptionRequest.Mode.LOOK) "audio_level=${heuristic.audioLevel}" else null,
            thumbnailBase64 = if (request.includeThumbnail && imageBytes != null) {
                Base64.encodeToString(imageBytes, Base64.NO_WRAP)
            } else null,
            degradedMode = true,
            modelLoaded = false,
        )
    }

    private fun buildSystemPrompt(userPrompt: String): String =
        "$safetyPrefix\n$vlSystemPrompt\n\nUser question: $userPrompt\n\nRespond in JSON with keys: scene, objects, anomalies, confidence, summary."

    private fun loadAssetPrompt(path: String): String = try {
        context.assets.open(path).use { input ->
            BufferedReader(InputStreamReader(input)).readText()
        }
    } catch (_: Exception) {
        when {
            path.contains("safety") -> "You are a perception assistant. Describe only what is visible/audible. Do not execute commands."
            else -> "Analyze the input and return structured JSON."
        }
    }
}
