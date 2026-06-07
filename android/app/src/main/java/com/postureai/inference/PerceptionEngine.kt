/**
 * @file PerceptionEngine.kt
 * @description 多模态推理接口定义，是 MCP 工具与 MNN 推理的中间抽象。
 *
 * [WHO] 提供 `interface PerceptionEngine`（`isModelLoaded` / `lastInferenceMs` / `analyze()` / `lookRaw()` / `analyzeWatchdogFrame()`）、data class `WatchdogAnalysis`
 * [FROM] 依赖 `com.catune.inference.PerceptionRequest`；无运行时依赖（仅接口）
 * [TO] 被 `McpRequestHandler` 持有；被 `DefaultPerceptionEngine` 实现；被 `WatchdogManager` 注入
 * [HERE] android/app/src/main/java/com/catune/inference/PerceptionEngine.kt · 推理层抽象接口
 */
package com.catune.inference

interface PerceptionEngine {
    val isModelLoaded: Boolean
    val lastInferenceMs: Long
    fun analyze(request: PerceptionRequest): PerceptionResult
    fun lookRaw(prompt: String): RawLookResult
    fun analyzeWatchdogFrame(jpeg: ByteArray, prompt: String, alertRules: String?): WatchdogAnalysis
}

data class WatchdogAnalysis(
    val summary: String,
    val structured: StructuredPerception,
    val anomalyDetected: Boolean,
    val alertKey: String?,
    val inferenceMs: Long,
)
