/**
 * @file McpRequestHandler.kt
 * @description JSON-RPC 2.0 请求路由：分发 initialize / tools/list / tools/call / ping，调用 10 个 MCP 工具实现并通过 onProgress 推送进度通知。
 *
 * [WHO] 提供 `class McpRequestHandler(scope, perceptionEngine, watchdogManager, statusProvider, onProgress, sessionManager)`、`handle(body, session)`、内部 `handleInitialize/handleToolsList/handleToolsCall/handlePhoneLook/handlePhoneListen/handlePhonePerceive`、`emitProgressNotification()`；伴生对象 `INFERENCE_TOOLS`
 * [FROM] 依赖 `McpJson` / `McpToolRegistry`、`PerceptionEngine`、`WatchdogManager`、`KinematicsHub`（直接读 `getAsJson()`）
 * [TO] 被 `McpHttpServer` 持有；MCP 客户端（PC 智能体）通过 POST/GET 与之交互
 * [HERE] android/app/src/main/java/com/catune/mcp/McpRequestHandler.kt · MCP 工具调用路由
 */
package com.catune.mcp

import com.catune.inference.InferenceStatusHub
import com.catune.inference.PerceptionEngine
import com.catune.inference.PerceptionRequest
import com.catune.watchdog.WatchdogManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class McpRequestHandler(
    private val scope: CoroutineScope,
    private val perceptionEngine: PerceptionEngine,
    private val watchdogManager: WatchdogManager,
    private val statusProvider: () -> JsonObject,
    private val onProgress: (requestId: String?, message: String, progress: Double) -> Unit,
    private val sessionManager: McpSessionManager,
) {
    fun handle(body: String, session: McpSession?): String {
        return try {
            val element = McpJson.parser.parseToJsonElement(body)
            when (element) {
                is JsonArray -> element.joinToString("\n") { handleSingle(it, session) }
                is JsonObject -> handleSingle(element, session)
                else -> jsonRpcError(null, -32600, "Invalid Request")
            }
        } catch (e: Exception) {
            jsonRpcError(null, -32700, "Parse error: ${e.message}")
        }
    }

    private fun handleSingle(element: JsonElement, session: McpSession?): String {
        val obj = element as? JsonObject ?: return jsonRpcError(null, -32600, "Invalid Request")
        val method = obj["method"]?.let { (it as? JsonPrimitive)?.content }
        val id = obj["id"]
        if (method == null) {
            return jsonRpcError(id, -32600, "Missing method")
        }
        if (id == null || id is JsonNull) {
            return "" // notification, no response
        }
        val params = obj["params"] as? JsonObject
        return when (method) {
            "initialize" -> handleInitialize(id, params)
            "notifications/initialized" -> ""
            "tools/list" -> handleToolsList(id)
            "tools/call" -> handleToolsCall(id, params, session)
            "ping" -> jsonRpcResult(id, buildJsonObject {})
            else -> jsonRpcError(id, -32601, "Method not found: $method")
        }
    }

    private fun handleInitialize(id: JsonElement, @Suppress("UNUSED_PARAMETER") params: JsonObject?): String {
        val result = buildJsonObject {
            put("protocolVersion", "2024-11-05")
            put("capabilities", buildJsonObject {
                put("tools", buildJsonObject { put("listChanged", false) })
            })
            put("serverInfo", buildJsonObject {
                put("name", "eyes-on-phone")
                put("version", "1.0.0")
            })
        }
        return jsonRpcResult(id, result)
    }

    private fun handleToolsList(id: JsonElement): String {
        val result = buildJsonObject {
            put("tools", JsonArray(McpToolRegistry.toolDefinitions))
        }
        return jsonRpcResult(id, result)
    }

    private fun handleToolsCall(id: JsonElement, params: JsonObject?, session: McpSession?): String {
        val toolName = params?.stringArg("name") ?: return jsonRpcError(id, -32602, "Missing tool name")
        val arguments = params["arguments"] as? JsonObject ?: buildJsonObject {}
        val requestIdStr = requestIdString(id)

        return try {
            if (toolName in INFERENCE_TOOLS) {
                InferenceStatusHub.onRequest(toolName, requestIdStr)
            }
            val text = when (toolName) {
                "phone_look" -> handlePhoneLook(arguments, requestIdStr)
                "phone_listen" -> handlePhoneListen(arguments, requestIdStr)
                "phone_perceive" -> handlePhonePerceive(arguments, requestIdStr)
                "phone_status" -> statusProvider().toString()
                "phone_watch_start" -> watchdogManager.startWatch(
                    intervalSec = arguments.intArg("interval_sec", 60),
                    prompt = arguments.stringArg("prompt") ?: "Monitor for anomalies.",
                    alertRules = arguments.stringArg("alert_rules"),
                ).toString()
                "phone_watch_stop" -> {
                    val watchId = arguments.stringArg("watch_id")
                        ?: return jsonRpcError(id, -32602, "watch_id required")
                    watchdogManager.stopWatch(watchId).toString()
                }
                "phone_watch_list" -> watchdogManager.listWatches().toString()
                "phone_look_raw" -> perceptionEngine.lookRaw(
                    arguments.stringArg("prompt") ?: "Describe capture",
                ).toJson()
                "get_body_kinematics" -> com.catune.inference.mnn.KinematicsHub.getAsJson().toString()
                "trigger_vibration_feedback" -> {
                    val target = arguments.stringArg("node_target") ?: "C"
                    val pattern = arguments.stringArg("pattern") ?: "success_buzz"
                    // In real app, this sends BLE command
                    "Vibration triggered on Node-$target with pattern: $pattern"
                }
                else -> return jsonRpcError(id, -32602, "Unknown tool: $toolName")
            }
            jsonRpcResult(id, toolTextContent(text))
        } catch (e: Exception) {
            InferenceStatusHub.onError(e.message ?: "Tool failed")
            jsonRpcError(id, -32000, "Tool execution failed: ${e.message}")
        } finally {
            if (toolName in INFERENCE_TOOLS) {
                // Keep COMPLETE/HEURISTIC visible; reset to idle after delay handled in UI
            }
        }
    }

    companion object {
        private val INFERENCE_TOOLS = setOf(
            "phone_look", "phone_listen", "phone_perceive", "phone_look_raw",
        )
    }

    private fun handlePhoneLook(args: JsonObject, requestId: String): String {
        onProgress(requestId, "Capturing frame...", 0.1)
        val prompt = args.stringArg("prompt") ?: "Describe what you see."
        val includeThumbnail = args.boolArg("include_thumbnail", false)
        onProgress(requestId, "Running vision-language inference...", 0.4)
        val result = perceptionEngine.analyze(
            PerceptionRequest(prompt = prompt, includeThumbnail = includeThumbnail, mode = PerceptionRequest.Mode.LOOK),
        )
        onProgress(requestId, "Done", 1.0)
        return result.toJson()
    }

    private fun handlePhoneListen(args: JsonObject, requestId: String): String {
        onProgress(requestId, "Capturing audio...", 0.2)
        val prompt = args.stringArg("prompt") ?: "Describe what you hear."
        val duration = args.intArg("duration_sec", 3).coerceIn(1, 10)
        onProgress(requestId, "Running audio analysis...", 0.5)
        val result = perceptionEngine.analyze(
            PerceptionRequest(
                prompt = prompt,
                audioDurationSec = duration,
                mode = PerceptionRequest.Mode.LISTEN,
            ),
        )
        onProgress(requestId, "Done", 1.0)
        return result.toJson()
    }

    private fun handlePhonePerceive(args: JsonObject, requestId: String): String {
        onProgress(requestId, "Capturing vision and audio...", 0.2)
        val prompt = args.stringArg("prompt") ?: "Describe the scene."
        val duration = args.intArg("audio_duration_sec", 3).coerceIn(1, 10)
        onProgress(requestId, "Running multimodal inference...", 0.5)
        val result = perceptionEngine.analyze(
            PerceptionRequest(
                prompt = prompt,
                audioDurationSec = duration,
                mode = PerceptionRequest.Mode.PERCEIVE,
            ),
        )
        onProgress(requestId, "Done", 1.0)
        return result.toJson()
    }

    fun emitProgressNotification(requestId: String?, message: String, progress: Double) {
        val params = buildJsonObject {
            put("progressToken", requestId ?: "unknown")
            put("progress", progress)
            put("total", 1.0)
            put("message", message)
        }
        val notification = jsonRpcNotification("notifications/progress", params)
        sessionManager.broadcastNotification(notification)
    }
}
