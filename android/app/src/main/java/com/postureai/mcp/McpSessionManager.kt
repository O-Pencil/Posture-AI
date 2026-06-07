/**
 * @file McpSessionManager.kt
 * @description 维护 mcp-session-id → McpSession 映射，notificationFlow 给 SSE 推送客户端消息。
 *
 * [WHO] 提供 `class McpSession(sessionId, notificationFlow: MutableSharedFlow<String>)`、`class McpSessionManager`、`createSession()` / `getSession(id)` / `removeSession(id)` / `broadcastNotification(json)`
 * [FROM] 依赖 `kotlinx.coroutines.flow.MutableSharedFlow(extraBufferCapacity=64)`、`java.util.UUID`、`ConcurrentHashMap`
 * [TO] 被 `McpHttpServer` 在 POST/GET 路由中获取或创建 session；被 `McpRequestHandler.emitProgressNotification` / `WatchdogManager.pushNotification` 广播消息
 * [HERE] android/app/src/main/java/com/catune/mcp/McpSessionManager.kt · MCP 会话存储
 */
package com.catune.mcp

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class McpSession(
    val sessionId: String,
    val notificationFlow: MutableSharedFlow<String> = MutableSharedFlow(extraBufferCapacity = 64),
)

class McpSessionManager {
    private val sessions = ConcurrentHashMap<String, McpSession>()

    fun createSession(): McpSession {
        val id = UUID.randomUUID().toString().replace("-", "")
        val session = McpSession(id)
        sessions[id] = session
        return session
    }

    fun getSession(sessionId: String?): McpSession? {
        if (sessionId.isNullOrBlank()) return null
        return sessions[sessionId]
    }

    fun removeSession(sessionId: String) {
        sessions.remove(sessionId)
    }

    fun broadcastNotification(json: String): Boolean {
        var emitted = false
        sessions.values.forEach { session ->
            if (session.notificationFlow.tryEmit(json)) {
                emitted = true
            }
        }
        return emitted
    }
}
