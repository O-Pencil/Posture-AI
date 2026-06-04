package com.postureai.inference.mnn

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
