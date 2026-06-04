/**
 * @file WatchdogManager.kt
 * @description 周期感知任务调度：startWatch 起协程循环、5 分钟同 alertKey 去重、命中异常落盘 + SSE 广播。
 *
 * [WHO] 提供 `class WatchdogManager(scope, perceptionEngine, cameraCaptureManager, sessionManager, alertStore)`、`data class WatchTask(watchId, intervalSec, prompt, alertRules, job)`、`startWatch(intervalSec, prompt, alertRules): String` / `stopWatch(watchId): String` / `listWatches(): String` / `stopAll()`、private `runWatchCycle(task)` / `pushNotification(alert)`
 * [FROM] 依赖 `CameraCaptureManager`、`PerceptionEngine`、`McpSessionManager`、`PendingAlertStore`、`kotlinx.coroutines.delay/launch/Job`
 * [TO] 被 MCP 工具 `phone_watch_start/stop/list` 通过 `McpRequestHandler` 调用
 * [HERE] android/app/src/main/java/com/postureai/watchdog/WatchdogManager.kt · 周期感知调度
 */
package com.postureai.watchdog

import com.postureai.capture.CameraCaptureManager
import com.postureai.inference.PerceptionEngine
import com.postureai.inference.StructuredPerception
import com.postureai.mcp.McpSessionManager
import com.postureai.mcp.jsonRpcNotification
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

data class WatchTask(
    val watchId: String,
    val intervalSec: Int,
    val prompt: String,
    val alertRules: String?,
    var job: Job? = null,
)

class WatchdogManager(
    private val scope: CoroutineScope,
    private val perceptionEngine: PerceptionEngine,
    private val cameraCaptureManager: CameraCaptureManager,
    private val sessionManager: McpSessionManager,
    private val alertStore: PendingAlertStore,
) {
    private val watches = ConcurrentHashMap<String, WatchTask>()
    private val lastAlertAt = ConcurrentHashMap<String, Long>()
    private val debounceMs = 5 * 60 * 1000L

    fun startWatch(intervalSec: Int, prompt: String, alertRules: String?): String {
        val id = "watch_${UUID.randomUUID().toString().take(8)}"
        val task = WatchTask(
            watchId = id,
            intervalSec = intervalSec.coerceAtLeast(10),
            prompt = prompt,
            alertRules = alertRules,
        )
        task.job = scope.launch {
            while (isActive) {
                runWatchCycle(task)
                delay(task.intervalSec * 1000L)
            }
        }
        watches[id] = task
        return buildJsonObject {
            put("watch_id", id)
            put("interval_sec", task.intervalSec)
            put("status", "started")
        }.toString()
    }

    fun stopWatch(watchId: String): String {
        val task = watches.remove(watchId)
            ?: return buildJsonObject { put("error", "not_found") }.toString()
        task.job?.cancel()
        return buildJsonObject {
            put("watch_id", watchId)
            put("status", "stopped")
        }.toString()
    }

    fun listWatches(): String {
        val arr = buildJsonArray {
            watches.values.forEach { w ->
                add(
                    buildJsonObject {
                        put("watch_id", w.watchId)
                        put("interval_sec", w.intervalSec)
                        put("prompt", w.prompt)
                        put("alert_rules", w.alertRules ?: "")
                    },
                )
            }
        }
        return buildJsonObject { put("watches", arr) }.toString()
    }

    fun stopAll() {
        watches.values.forEach { it.job?.cancel() }
        watches.clear()
    }

    private suspend fun runWatchCycle(task: WatchTask) {
        val frame = cameraCaptureManager.getLatestWatchdogFrame()
            ?: cameraCaptureManager.captureFrame(maxLongEdge = 480)
        val analysis = perceptionEngine.analyzeWatchdogFrame(frame, task.prompt, task.alertRules)
        if (!analysis.anomalyDetected) return

        val alertKey = analysis.alertKey ?: "generic_anomaly"
        val now = System.currentTimeMillis()
        val last = lastAlertAt[alertKey] ?: 0L
        if (now - last < debounceMs) return
        lastAlertAt[alertKey] = now

        val alert = PendingAlert(
            alertKey = alertKey,
            watchId = task.watchId,
            summary = analysis.summary,
            structuredJson = Json.encodeToString(StructuredPerception.serializer(), analysis.structured),
            timestampMs = now,
        )
        alertStore.addAlert(alert)
        pushNotification(alert)
    }

    private fun pushNotification(alert: PendingAlert) {
        val params = buildJsonObject {
            put("level", "warning")
            put("message", alert.summary)
            put("data", buildJsonObject {
                put("alert_key", alert.alertKey)
                put("watch_id", alert.watchId)
                put("timestamp_ms", alert.timestampMs)
            })
        }
        val notification = jsonRpcNotification("notifications/message", params)
        sessionManager.broadcastNotification(notification)
    }
}
