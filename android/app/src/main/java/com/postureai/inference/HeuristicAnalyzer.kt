/**
 * @file HeuristicAnalyzer.kt
 * @description 无 VL 权重时的降级分析器，像素级 RGB/亮度统计，支持 print_failed / led 简易规则告警。
 *
 * [WHO] 提供 `object HeuristicAnalyzer`、`data class HeuristicResult`、`analyze(jpeg, prompt, alertRules, hasAudio): HeuristicResult`、`analyzeAudio(pcm, prompt): HeuristicResult`
 * [FROM] 依赖 `android.graphics.BitmapFactory`；纯计算无其他模块依赖
 * [TO] 被 `DefaultPerceptionEngine.buildHeuristicResult()` 和 `analyzeWatchdogFrame()` 降级路径调用
 * [HERE] android/app/src/main/java/com/catune/inference/HeuristicAnalyzer.kt · 启发式降级分析
 */
package com.catune.inference

import android.graphics.BitmapFactory
import kotlin.math.abs

object HeuristicAnalyzer {
    data class HeuristicResult(
        val summary: String,
        val structured: StructuredPerception,
        val anomalyDetected: Boolean = false,
        val alertKey: String? = null,
        val audioLevel: Int = 0,
    )

    fun analyze(jpeg: ByteArray, prompt: String, alertRules: String?, hasAudio: Boolean = false): HeuristicResult {
        val bmp = BitmapFactory.decodeByteArray(jpeg, 0, jpeg.size)
        if (bmp == null) {
            return HeuristicResult(
                summary = "Unable to decode camera frame.",
                structured = StructuredPerception(scene = "unknown", confidence = "low"),
            )
        }
        val w = bmp.width
        val h = bmp.height
        val pixels = IntArray(w * h)
        bmp.getPixels(pixels, 0, w, 0, 0, w, h)
        bmp.recycle()

        var rSum = 0L
        var gSum = 0L
        var bSum = 0L
        var dark = 0
        var bright = 0
        for (p in pixels) {
            val r = (p shr 16) and 0xFF
            val g = (p shr 8) and 0xFF
            val b = p and 0xFF
            rSum += r
            gSum += g
            bSum += b
            val lum = (0.299 * r + 0.587 * g + 0.114 * b).toInt()
            if (lum < 40) dark++
            if (lum > 220) bright++
        }
        val n = pixels.size.coerceAtLeast(1)
        val avgR = (rSum / n).toInt()
        val avgG = (gSum / n).toInt()
        val avgB = (bSum / n).toInt()
        val darkRatio = dark.toDouble() / n
        val brightRatio = bright.toDouble() / n

        val dominant = when {
            avgR > avgG + 30 && avgR > avgB + 30 -> "reddish"
            avgG > avgR + 30 && avgG > avgB + 30 -> "greenish"
            avgB > avgR + 30 && avgB > avgG + 30 -> "bluish"
            else -> "neutral"
        }

        val anomalies = mutableListOf<String>()
        var alertKey: String? = null
        if (darkRatio > 0.55) anomalies.add("scene_mostly_dark")
        if (brightRatio > 0.35) anomalies.add("high_brightness_regions")

        val rules = alertRules?.lowercase().orEmpty()
        val printFailed = rules.contains("print_failed") || rules.contains("炒面") || prompt.contains("print", true)
        if (printFailed && brightRatio > 0.25 && darkRatio < 0.2) {
            anomalies.add("possible_3d_print_failure_bright_clusters")
            alertKey = "print_failed"
        }
        if (rules.contains("led") || prompt.contains("led", true)) {
            if (dominant == "reddish" || dominant == "greenish") {
                anomalies.add("indicator_color_detected_$dominant")
                alertKey = "led_changed"
            }
        }

        val scene = "Camera view ${w}x$h, dominant tone $dominant (avg RGB $avgR,$avgG,$avgB)."
        val summary = "$scene Answering: $prompt" +
            if (hasAudio) " Audio buffer was included." else ""

        return HeuristicResult(
            summary = summary,
            structured = StructuredPerception(
                scene = scene,
                objects = listOf(
                    PerceivedObject("environment", dominant),
                    PerceivedObject("brightness", "dark=${"%.0f".format(darkRatio * 100)}% bright=${"%.0f".format(brightRatio * 100)}%"),
                ),
                anomalies = anomalies,
                confidence = if (anomalies.isEmpty()) "medium" else "low",
            ),
            anomalyDetected = alertKey != null,
            alertKey = alertKey,
        )
    }

    fun analyzeAudio(pcm: ByteArray, prompt: String): HeuristicResult {
        var energy = 0L
        var i = 0
        while (i + 1 < pcm.size) {
            val sample = (pcm[i + 1].toInt() shl 8) or (pcm[i].toInt() and 0xFF)
            energy += abs(sample)
            i += 2
        }
        val avg = if (pcm.isEmpty()) 0 else (energy / (pcm.size / 2)).toInt()
        val level = when {
            avg > 8000 -> "loud"
            avg > 2000 -> "moderate"
            else -> "quiet"
        }
        return HeuristicResult(
            summary = "Audio environment is $level (energy=$avg). Prompt: $prompt",
            structured = StructuredPerception(
                scene = "audio:$level",
                anomalies = if (avg > 12000) listOf("loud_transient") else emptyList(),
                confidence = "medium",
            ),
            audioLevel = avg,
        )
    }
}
