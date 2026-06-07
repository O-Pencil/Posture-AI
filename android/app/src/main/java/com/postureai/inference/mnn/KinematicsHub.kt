/**
 * @file KinematicsHub.kt
 * @description 实时姿态状态机：聚合颈前倾/腰椎侧倾角度，按规则归类 Posture 枚举并维护 0-100 健康分。
 *
 * [WHO] 提供 `object KinematicsHub`、`enum Posture(NORMAL/SLUMPED/TECH_NECK/LEFT_LEAN/OFFLINE)`、`data class State(neckPitch, lumbarRoll, posture, score, abnormalDurationMinutes)`、`update(neck, lumbar)`、`setOffline()`、`getAsJson()`
 * [FROM] 依赖 `kotlinx.coroutines.flow.MutableStateFlow`、`kotlinx.serialization.json.buildJsonObject`
 * [TO] 被 `KinematicsModule` RN 桥接订阅；被 `SpineBluetoothManager.processIncomingData()` 写入；被 MCP 工具 `get_body_kinematics` 通过 `getAsJson()` 读取
 * [HERE] android/app/src/main/java/com/catune/inference/mnn/KinematicsHub.kt · 姿态状态枢纽（RN/BLE/MCP 共享）
 */
package com.catune.inference.mnn

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

object KinematicsHub {
    enum class Posture(val label: String) {
        NORMAL("Normal"),
        SLUMPED("Slumped (Hunchback)"),
        TECH_NECK("Tech Neck"),
        LEFT_LEAN("Leaning Left"),
        OFFLINE("Disconnected")
    }

    data class State(
        val neckPitch: Float = 0f,
        val lumbarRoll: Float = 0f,
        val posture: Posture = Posture.NORMAL,
        val score: Int = 100,
        val abnormalDurationMinutes: Int = 0
    )

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state

    // Simple cumulative scoring for demo
    private var totalSamples = 0
    private var healthySamples = 0

    fun update(neck: Float, lumbar: Float) {
        val currentPosture = when {
            neck > 20f -> Posture.TECH_NECK
            lumbar > 15f -> Posture.SLUMPED
            lumbar < -10f -> Posture.LEFT_LEAN
            else -> Posture.NORMAL
        }

        totalSamples++
        if (currentPosture == Posture.NORMAL) healthySamples++
        
        val newScore = if (totalSamples > 0) (healthySamples * 100 / totalSamples) else 100

        _state.value = State(
            neckPitch = neck,
            lumbarRoll = lumbar,
            posture = currentPosture,
            score = newScore,
            abnormalDurationMinutes = if (currentPosture != Posture.NORMAL) 1 else 0 // Simplified for demo
        )
    }

    fun setOffline() {
        _state.value = _state.value.copy(posture = Posture.OFFLINE)
    }

    fun getAsJson() = buildJsonObject {
        put("neck_pitch", _state.value.neckPitch)
        put("lumbar_roll", _state.value.lumbarRoll)
        put("posture", _state.value.posture.name)
        put("posture_label", _state.value.posture.label)
        put("score", _state.value.score)
    }
}
