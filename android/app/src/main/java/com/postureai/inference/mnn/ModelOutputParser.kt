/**
 * @file ModelOutputParser.kt
 * @description 解析 MNN 原始输出：去 markdown 围栏、提取 JSON、解析 scene/objects/anomalies/confidence/summary。
 *
 * [WHO] 提供 `object ModelOutputParser`、`data class ParsedModelOutput`、`extractJsonPayload(raw: String): String`、`parse(raw: String): ParsedModelOutput`
 * [FROM] 依赖 `kotlinx.serialization.json.Json { ignoreUnknownKeys = true }`、`StructuredPerception` / `PerceivedObject` 模型
 * [TO] 被 `MnnPerceptionEngine.analyze()` 在拿到 raw 输出后解析
 * [HERE] android/app/src/main/java/com/catune/inference/mnn/ModelOutputParser.kt · MNN 输出 JSON 解析器
 */
package com.catune.inference.mnn

import com.catune.inference.PerceivedObject
import com.catune.inference.StructuredPerception
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

data class ParsedModelOutput(
    val summary: String,
    val structured: StructuredPerception,
    val parseWarning: String? = null,
)

object ModelOutputParser {
    private val json = Json { ignoreUnknownKeys = true }

    /** Strip markdown fences and isolate the JSON object. */
    fun extractJsonPayload(raw: String): String {
        var text = raw.trim()
        if (text.startsWith("```")) {
            val firstLineEnd = text.indexOf('\n')
            if (firstLineEnd > 0) {
                text = text.substring(firstLineEnd + 1)
            } else {
                text = text.removePrefix("```")
            }
            val fenceEnd = text.lastIndexOf("```")
            if (fenceEnd >= 0) {
                text = text.substring(0, fenceEnd)
            }
        }
        val start = text.indexOf('{')
        val end = text.lastIndexOf('}')
        return if (start >= 0 && end > start) {
            text.substring(start, end + 1)
        } else {
            text
        }
    }

    fun parse(raw: String): ParsedModelOutput {
        if (raw.isBlank()) {
            return ParsedModelOutput(
                summary = "Empty model output",
                structured = StructuredPerception(scene = "unknown", confidence = "low"),
                parseWarning = "empty_output",
            )
        }

        val payload = extractJsonPayload(raw)
        return try {
            val obj = json.parseToJsonElement(payload).jsonObject
            val scene = obj["scene"]?.jsonPrimitive?.content ?: "unknown"
            val summary = obj["summary"]?.jsonPrimitive?.content
                ?: obj["description"]?.jsonPrimitive?.content
                ?: raw.take(500)
            val anomalies = obj["anomalies"]?.jsonArray?.map { it.jsonPrimitive.content } ?: emptyList()
            val objects = obj["objects"]?.jsonArray?.mapNotNull { el ->
                val o = el.jsonObject
                val label = o["label"]?.jsonPrimitive?.content ?: return@mapNotNull null
                val state = o["state"]?.jsonPrimitive?.content ?: ""
                PerceivedObject(label, state)
            } ?: emptyList()
            val confidence = obj["confidence"]?.jsonPrimitive?.content ?: "medium"
            ParsedModelOutput(
                summary = summary,
                structured = StructuredPerception(scene, objects, anomalies, confidence),
                parseWarning = if (payload != raw.trim()) "extracted_from_markdown" else null,
            )
        } catch (e: Exception) {
            ParsedModelOutput(
                summary = raw.take(800),
                structured = StructuredPerception(
                    scene = raw.take(200),
                    confidence = "low",
                ),
                parseWarning = "json_parse_failed: ${e.message}",
            )
        }
    }
}
