/**
 * @file PerceptionModels.kt
 * @description 推理层可序列化数据契约：请求、结果、结构化感知对象、原始 LOOK 响应。
 *
 * [WHO] 提供 `data class PerceptionRequest`（含 `Mode` 枚举 `LOOK/LISTEN/PERCEIVE`）、`data class PerceptionResult`、`data class StructuredPerception`、`data class PerceivedObject`、`data class RawLookResult`
 * [FROM] 依赖 `kotlinx.serialization`（`@Serializable`、`Json.encodeToString`）
 * [TO] 被 `PerceptionEngine.analyze()` / `lookRaw()` 返回；`toJson()` 输出给 MCP 工具调用方（PC LLM 智能体）
 * [HERE] android/app/src/main/java/com/catune/inference/PerceptionModels.kt · 推理数据契约
 */
package com.catune.inference

import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
data class StructuredPerception(
    val scene: String,
    val objects: List<PerceivedObject> = emptyList(),
    val anomalies: List<String> = emptyList(),
    val confidence: String = "medium",
)

@Serializable
data class PerceivedObject(
    val label: String,
    val state: String,
)

data class PerceptionRequest(
    val prompt: String,
    val includeThumbnail: Boolean = false,
    val audioDurationSec: Int = 3,
    val mode: Mode,
) {
    enum class Mode { LOOK, LISTEN, PERCEIVE }
}

@Serializable
data class PerceptionResult(
    val summary: String,
    val structured: StructuredPerception,
    val capturedAtMs: Long = System.currentTimeMillis(),
    val inferenceMs: Long = 0,
    val transcriptHint: String? = null,
    val thumbnailBase64: String? = null,
    val degradedMode: Boolean = false,
    val modelLoaded: Boolean = false,
    /** Raw text from the VL model (for debugging truncated or markdown-wrapped JSON). */
    val rawModelOutput: String? = null,
    val parseWarning: String? = null,
) {
    fun toJson(): String = Json.encodeToString(serializer(), this)
}

@Serializable
data class RawLookResult(
    val prompt: String,
    val thumbnailBase64: String,
    val degradedMode: Boolean = true,
    val message: String,
) {
    fun toJson(): String = Json.encodeToString(this)
}
