/**
 * @file McpToolRegistry.kt
 * @description 10 个 MCP 工具的 JSON Schema 定义（phone_look/listen/perceive/status/watch_*/look_raw + get_body_kinematics + trigger_vibration_feedback）。
 *
 * [WHO] 提供 `object McpToolRegistry.toolDefinitions: List<JsonObject>`、私有 `tool()` / `schema()` 辅助构造
 * [FROM] 依赖 `kotlinx.serialization.json.buildJsonObject/put/JsonArray/JsonPrimitive`
 * [TO] 被 `McpRequestHandler.handleToolsList()` 序列化返回；其工具名与 `handleToolsCall` 的 `when` 分支对应
 * [HERE] android/app/src/main/java/com/catune/mcp/McpToolRegistry.kt · MCP 工具清单
 */
package com.catune.mcp

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

object McpToolRegistry {
    val toolDefinitions: List<JsonObject> = listOf(
        tool(
            "phone_look",
            "Capture a camera frame and analyze it with on-device vision-language model.",
            schema {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("prompt", buildJsonObject { put("type", "string"); put("description", "Question about the scene") })
                    put("include_thumbnail", buildJsonObject { put("type", "boolean"); put("default", false) })
                })
                put("required", kotlinx.serialization.json.JsonArray(listOf(kotlinx.serialization.json.JsonPrimitive("prompt"))))
            },
        ),
        tool(
            "phone_listen",
            "Capture recent microphone audio and analyze with on-device model.",
            schema {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("prompt", buildJsonObject { put("type", "string") })
                    put("duration_sec", buildJsonObject { put("type", "integer"); put("default", 3); put("maximum", 10) })
                })
                put("required", kotlinx.serialization.json.JsonArray(listOf(kotlinx.serialization.json.JsonPrimitive("prompt"))))
            },
        ),
        tool(
            "phone_perceive",
            "Combined vision and audio analysis in one inference call.",
            schema {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("prompt", buildJsonObject { put("type", "string") })
                    put("audio_duration_sec", buildJsonObject { put("type", "integer"); put("default", 3) })
                })
                put("required", kotlinx.serialization.json.JsonArray(listOf(kotlinx.serialization.json.JsonPrimitive("prompt"))))
            },
        ),
        tool(
            "phone_status",
            "Device health, model state, service uptime, and pending alerts.",
            schema { put("type", "object"); put("properties", buildJsonObject {}) },
        ),
        tool(
            "phone_watch_start",
            "Start periodic watchdog perception with optional alert rules.",
            schema {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("interval_sec", buildJsonObject { put("type", "integer"); put("default", 60) })
                    put("prompt", buildJsonObject { put("type", "string") })
                    put("alert_rules", buildJsonObject { put("type", "string") })
                })
            },
        ),
        tool(
            "phone_watch_stop",
            "Stop a watchdog task by watch_id.",
            schema {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("watch_id", buildJsonObject { put("type", "string") })
                })
                put("required", kotlinx.serialization.json.JsonArray(listOf(kotlinx.serialization.json.JsonPrimitive("watch_id"))))
            },
        ),
        tool(
            "phone_watch_list",
            "List active watchdog tasks.",
            schema { put("type", "object"); put("properties", buildJsonObject {}) },
        ),
        tool(
            "phone_look_raw",
            "Degraded mode: return base64 JPEG thumbnail without VL inference.",
            schema {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("prompt", buildJsonObject { put("type", "string") })
                })
            },
        ),
        tool(
            "get_body_kinematics",
            "Get real-time spine kinematics data (angles, rotation, and current posture state).",
            schema {
                put("type", "object")
                put("properties", buildJsonObject {})
            },
        ),
        tool(
            "trigger_vibration_feedback",
            "Send vibration feedback to the wearable hardware.",
            schema {
                put("type", "object")
                put("properties", buildJsonObject {
                    put("node_target", buildJsonObject { 
                        put("type", "string")
                        put("enum", kotlinx.serialization.json.JsonArray(listOf(
                            kotlinx.serialization.json.JsonPrimitive("C"), 
                            kotlinx.serialization.json.JsonPrimitive("L")
                        ))) 
                    })
                    put("pattern", buildJsonObject { 
                        put("type", "string")
                        put("enum", kotlinx.serialization.json.JsonArray(listOf(
                            kotlinx.serialization.json.JsonPrimitive("alert_danger"), 
                            kotlinx.serialization.json.JsonPrimitive("success_buzz")
                        ))) 
                    })
                })
                put("required", kotlinx.serialization.json.JsonArray(listOf(
                    kotlinx.serialization.json.JsonPrimitive("node_target"),
                    kotlinx.serialization.json.JsonPrimitive("pattern")
                )))
            },
        ),
    )

    private fun tool(name: String, description: String, inputSchema: JsonObject): JsonObject =
        buildJsonObject {
            put("name", name)
            put("description", description)
            put("inputSchema", inputSchema)
        }

    private inline fun schema(block: kotlinx.serialization.json.JsonObjectBuilder.() -> Unit): JsonObject =
        buildJsonObject(block)
}
