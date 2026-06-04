/**
 * @file ServiceRuntime.kt
 * @description MCP 服务运行时编排：装配 PerceptionEngine/WatchdogManager/McpHttpServer/McpRequestHandler，聚合 buildStatus() JSON。
 *
 * [WHO] 提供 `class ServiceRuntime(context, pairingManager, lifecycleOwner)`、`start()` / `stop()` / `isRunning()` / `uptimeMs()`、private `buildStatus(): JsonObject`；lateinit 字段 `perceptionEngine` / `watchdogManager` / `mcpServer` / `requestHandler`
 * [FROM] 依赖所有核心模块（Capture/Inference/MCP/Watchdog/Pairing）、`BatteryManager`、`SystemClock.elapsedRealtime()`
 * [TO] 被 `McpForegroundService.onStartCommand` 创建并启动；`buildStatus()` 被 MCP 工具 `phone_status` 调用
 * [HERE] android/app/src/main/java/com/postureai/service/ServiceRuntime.kt · MCP 服务运行时装配
 */
package com.postureai.service

import android.content.Context
import android.os.BatteryManager
import android.os.SystemClock
import com.postureai.capture.AudioCaptureManager
import com.postureai.capture.CameraCaptureManager
import com.postureai.inference.DefaultPerceptionEngine
import com.postureai.inference.PerceptionEngine
import com.postureai.inference.mnn.InferenceExecutor
import com.postureai.mcp.McpHttpServer
import com.postureai.mcp.McpRequestHandler
import com.postureai.mcp.McpSessionManager
import com.postureai.pairing.PairingManager
import com.postureai.watchdog.PendingAlertStore
import com.postureai.watchdog.WatchdogManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.concurrent.atomic.AtomicLong

class ServiceRuntime(
    private val context: Context,
    private val pairingManager: PairingManager,
    private val lifecycleOwner: androidx.lifecycle.LifecycleOwner,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val startedAt = AtomicLong(0)

    val cameraCaptureManager = CameraCaptureManager(context)
    val audioCaptureManager = AudioCaptureManager()
    val sessionManager = McpSessionManager()
    val alertStore = PendingAlertStore(context)

    lateinit var perceptionEngine: PerceptionEngine
        private set
    lateinit var watchdogManager: WatchdogManager
        private set
    lateinit var mcpServer: McpHttpServer
        private set
    lateinit var requestHandler: McpRequestHandler
        private set

    suspend fun start() {
        if (startedAt.get() > 0) return
        startedAt.set(SystemClock.elapsedRealtime())

        perceptionEngine = DefaultPerceptionEngine(context, cameraCaptureManager, audioCaptureManager)
        watchdogManager = WatchdogManager(
            scope = scope,
            perceptionEngine = perceptionEngine,
            cameraCaptureManager = cameraCaptureManager,
            sessionManager = sessionManager,
            alertStore = alertStore,
        )

        lateinit var handler: McpRequestHandler
        handler = McpRequestHandler(
            scope = scope,
            perceptionEngine = perceptionEngine,
            watchdogManager = watchdogManager,
            statusProvider = { buildStatus() },
            onProgress = { requestId, message, progress ->
                handler.emitProgressNotification(requestId, message, progress)
            },
            sessionManager = sessionManager,
        )
        requestHandler = handler

        mcpServer = McpHttpServer(
            port = pairingManager.serverPort,
            expectedToken = pairingManager.bearerToken,
            requestHandler = requestHandler,
            sessionManager = sessionManager,
        )
        mcpServer.start()
        audioCaptureManager.start()
        cameraCaptureManager.bind(lifecycleOwner)
    }

    fun stop() {
        watchdogManager.stopAll()
        mcpServer.stop()
        audioCaptureManager.stop()
        cameraCaptureManager.unbind()
        startedAt.set(0)
    }

    fun isRunning(): Boolean = startedAt.get() > 0

    fun uptimeMs(): Long =
        if (startedAt.get() > 0) SystemClock.elapsedRealtime() - startedAt.get() else 0

    private fun buildStatus() = buildJsonObject {
        val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val battery = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        put("battery_percent", battery)
        put("model_loaded", perceptionEngine.isModelLoaded)
        put("mnn_load_error", InferenceExecutor.loadError() ?: "")
        put("last_inference_ms", perceptionEngine.lastInferenceMs)
        put("uptime_ms", uptimeMs())
        put("mcp_port", pairingManager.serverPort)
        put("pending_alerts", Json.parseToJsonElement(alertStore.toJson()))
        put("service_running", isRunning())
    }
}
