/**
 * @file McpJson.kt
 * @description MCP JSON-RPC 2.0 数据类与 JSON 辅助函数（参数读取、错误响应、SSE 工具文本内容）。
 *
 * [WHO] 提供 `object McpJson`（共享 `Json` 解析器）、`data class JsonRpcRequest/Response/Error/Notification`、函数 `jsonRpcResult()` / `jsonRpcError()` / `jsonRpcNotification()`、扩展 `JsonObject.stringArg/intArg/boolArg`、`toolTextContent(text)`、`requestIdString(id)`
 * [FROM] 依赖 `kotlinx.serialization.json.*`
 * [TO] 被 `McpRequestHandler`、`McpToolRegistry`、`WatchdogManager.pushNotification()` 复用
 * [HERE] android/app/src/main/java/com/catune/mcp/McpJson.kt · MCP JSON-RPC 序列化工具
 */
package com.catune.mcp

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

object McpJson {
    val parser = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        isLenient = true
    }
}

@Serializable
data class JsonRpcRequest(
    val jsonrpc: String = "2.0",
    val id: JsonElement? = null,
    val method: String,
    val params: JsonObject? = null,
)

@Serializable
data class JsonRpcResponse(
    val jsonrpc: String = "2.0",
    val id: JsonElement? = null,
    val result: JsonElement? = null,
    val error: JsonRpcError? = null,
)

@Serializable
data class JsonRpcError(
    val code: Int,
    val message: String,
    val data: JsonElement? = null,
)

@Serializable
data class JsonRpcNotification(
    val jsonrpc: String = "2.0",
    val method: String,
    val params: JsonObject? = null,
)

fun jsonRpcResult(id: JsonElement?, result: JsonElement): String =
    McpJson.parser.encodeToString(JsonRpcResponse.serializer(), JsonRpcResponse(id = id, result = result))

fun jsonRpcError(id: JsonElement?, code: Int, message: String): String =
    McpJson.parser.encodeToString(
        JsonRpcResponse.serializer(),
        JsonRpcResponse(id = id, error = JsonRpcError(code, message)),
    )

fun jsonRpcNotification(method: String, params: JsonObject): String =
    McpJson.parser.encodeToString(
        JsonRpcNotification.serializer(),
        JsonRpcNotification(method = method, params = params),
    )

fun JsonObject.stringArg(name: String): String? =
    this[name]?.jsonPrimitive?.content

fun JsonObject.intArg(name: String, default: Int): Int =
    this[name]?.jsonPrimitive?.content?.toIntOrNull() ?: default

fun JsonObject.boolArg(name: String, default: Boolean): Boolean =
    when (val el = this[name]) {
        null -> default
        is JsonPrimitive -> el.content.toBooleanStrictOrNull() ?: default
        else -> default
    }

fun toolTextContent(text: String): JsonObject = buildJsonObject {
    put(
        "content",
        JsonArray(
            listOf(
                buildJsonObject {
                    put("type", "text")
                    put("text", text)
                },
            ),
        ),
    )
}

fun requestIdString(id: JsonElement?): String = when (id) {
    null -> "null"
    is JsonPrimitive -> id.content
    else -> id.toString()
}
