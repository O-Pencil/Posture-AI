/**
 * @file PendingAlertStore.kt
 * @description 告警落盘存储：FIFO 最多 20 条，序列化到 filesDir/pending_alerts.json；提供 toJson() 给 phone_status 工具读。
 *
 * [WHO] 提供 `class PendingAlertStore(context)`、`data class PendingAlert(alertKey, watchId, summary, structuredJson, timestampMs)`、方法 `addAlert(alert)` / `loadAll(): List<PendingAlert>` / `clear()` / `toJson(): String`
 * [FROM] 依赖 `kotlinx.serialization.builtins.ListSerializer` + `Json`
 * [TO] 被 `WatchdogManager.runWatchCycle` 命中异常时调 `addAlert`；被 `ServiceRuntime.buildStatus` 通过 `toJson()` 读
 * [HERE] android/app/src/main/java/com/postureai/watchdog/PendingAlertStore.kt · 告警持久化
 */
package com.postureai.watchdog

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File

@Serializable
data class PendingAlert(
    val alertKey: String,
    val watchId: String,
    val summary: String,
    val structuredJson: String,
    val timestampMs: Long,
)

class PendingAlertStore(context: Context) {
    private val file = File(context.filesDir, "pending_alerts.json")
    private val maxAlerts = 20
    private val listSerializer = ListSerializer(PendingAlert.serializer())

    @Synchronized
    fun addAlert(alert: PendingAlert) {
        val current = loadAll().toMutableList()
        current.add(0, alert)
        while (current.size > maxAlerts) current.removeLast()
        file.writeText(Json.encodeToString(listSerializer, current))
    }

    @Synchronized
    fun loadAll(): List<PendingAlert> {
        if (!file.exists()) return emptyList()
        return try {
            Json.decodeFromString(listSerializer, file.readText())
        } catch (_: Exception) {
            emptyList()
        }
    }

    @Synchronized
    fun clear() {
        file.delete()
    }

    fun toJson(): String = Json.encodeToString(listSerializer, loadAll())
}
