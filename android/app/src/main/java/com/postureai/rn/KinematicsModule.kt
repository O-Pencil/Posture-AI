package com.postureai.rn

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.postureai.inference.mnn.KinematicsHub
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class KinematicsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    override fun getName(): String = "KinematicsModule"

    init {
        // Observe KinematicsHub and emit events to JS
        scope.launch {
            KinematicsHub.state.collectLatest { state ->
                val params = com.facebook.react.bridge.Arguments.createMap().apply {
                    putDouble("neckPitch", state.neckPitch.toDouble())
                    putDouble("lumbarRoll", state.lumbarRoll.toDouble())
                    putString("posture", state.posture.name)
                    putString("postureLabel", state.posture.label)
                    putInt("score", state.score)
                }
                sendEvent("onKinematicsUpdate", params)
            }
        }
    }

    private fun sendEvent(eventName: String, params: com.facebook.react.bridge.WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun getLatestState(promise: com.facebook.react.bridge.Promise) {
        val state = KinematicsHub.state.value
        val map = com.facebook.react.bridge.Arguments.createMap().apply {
            putDouble("neckPitch", state.neckPitch.toDouble())
            putDouble("lumbarRoll", state.lumbarRoll.toDouble())
            putString("posture", state.posture.name)
            putString("postureLabel", state.posture.label)
            putInt("score", state.score)
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun setSimulationScenario(scenario: String) {
        // This will be used by F7 Mock Console
        Log.d("KinematicsModule", "Setting scenario: $scenario")
        // Implementation: We can update KinematicsHub with specific values based on scenario
        when(scenario) {
            "NORMAL" -> KinematicsHub.update(5.0f, 2.0f)
            "SLUMPED" -> KinematicsHub.update(10.0f, 25.0f)
            "TECH_NECK" -> KinematicsHub.update(35.0f, 5.0f)
            "LEFT_LEAN" -> KinematicsHub.update(5.0f, -15.0f)
            "OFFLINE" -> KinematicsHub.setOffline()
        }
    }
    
    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN built-in EventEmitters
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN built-in EventEmitters
    }
}
