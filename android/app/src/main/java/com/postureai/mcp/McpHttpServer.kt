/**
 * @file McpHttpServer.kt
 * @description 基于 Ktor CIO 的嵌入式 MCP HTTP 服务，监听 0.0.0.0:8765，POST /mcp 走 JSON-RPC 2.0，GET /mcp 走 SSE 流。
 *
 * [WHO] 提供 `class McpHttpServer(port, expectedToken, requestHandler, sessionManager)`、`start()` / `stop()`、内部 `authorize(header: String?): Boolean`、CORS 配置
 * [FROM] 依赖 io.ktor（server-core/cio/cors/websockets/content-negotiation 2.3.12）、`McpRequestHandler`、`McpSessionManager`
 * [TO] 被 `ServiceRuntime.start()` 启动；HTTP 客户端是 PC 端 LLM 智能体（Claude Code / Codex 等）
 * [HERE] android/app/src/main/java/com/catune/mcp/McpHttpServer.kt · MCP HTTP/SSE 入口
 */
package com.catune.mcp

import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.install
import io.ktor.server.cio.CIO
import io.ktor.server.engine.EmbeddedServer
import io.ktor.server.engine.embeddedServer
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.request.receiveText
import io.ktor.server.response.respond
import io.ktor.server.response.respondBytesWriter
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.utils.io.writeStringUtf8
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

class McpHttpServer(
    private val port: Int,
    private val expectedToken: String,
    private val requestHandler: McpRequestHandler,
    private val sessionManager: McpSessionManager,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var server: EmbeddedServer<*, *>? = null

    fun start() {
        if (server != null) return
        server = embeddedServer(CIO, host = "0.0.0.0", port = port) {
            install(CORS) {
                anyHost()
                allowMethod(HttpMethod.Options)
                allowMethod(HttpMethod.Get)
                allowMethod(HttpMethod.Post)
                allowHeader(HttpHeaders.Authorization)
                allowHeader(HttpHeaders.ContentType)
                allowHeader("mcp-session-id")
                allowHeader("mcp-protocol-version")
                allowHeader("Last-Event-ID")
            }

            routing {
                get("/") {
                    call.respondText("Catune MCP Server", ContentType.Text.Plain)
                }

                route("/mcp") {
                    post {
                        if (!authorize(call.request.headers["Authorization"])) {
                            call.respond(HttpStatusCode.Unauthorized, "Unauthorized")
                            return@post
                        }
                        val sessionId = call.request.headers["mcp-session-id"]
                        val session = sessionManager.getSession(sessionId)
                            ?: sessionManager.createSession().also {
                                call.response.headers.append("mcp-session-id", it.sessionId)
                            }
                        val body = call.receiveText()
                        if (body.isBlank()) {
                            call.respond(HttpStatusCode.BadRequest, "Empty body")
                            return@post
                        }
                        val response = requestHandler.handle(body, session)
                        if (response.isBlank()) {
                            call.respond(HttpStatusCode.Accepted)
                        } else {
                            call.respondText(response, ContentType.Application.Json)
                        }
                    }

                    get {
                        if (!authorize(call.request.headers["Authorization"])) {
                            call.respond(HttpStatusCode.Unauthorized, "Unauthorized")
                            return@get
                        }
                        val sessionId = call.request.headers["mcp-session-id"]
                        val session = sessionManager.getSession(sessionId)
                            ?: sessionManager.createSession().also {
                                call.response.headers.append("mcp-session-id", it.sessionId)
                            }

                        call.respondBytesWriter(contentType = ContentType.Text.EventStream) {
                            writeStringUtf8("event: endpoint\ndata: /mcp\n\n")
                            val job = scope.launch {
                                session.notificationFlow.collect { payload ->
                                    writeStringUtf8("event: message\ndata: $payload\n\n")
                                }
                            }
                            try {
                                delay(Long.MAX_VALUE)
                            } finally {
                                job.cancel()
                            }
                        }
                    }
                }
            }
        }.start(wait = false)
    }

    fun stop() {
        server?.stop(gracePeriodMillis = 500, timeoutMillis = 1500)
        server = null
        scope.cancel()
    }

    private fun authorize(header: String?): Boolean {
        if (header == null) return false
        val token = header.removePrefix("Bearer ").trim()
        return token == expectedToken
    }
}
