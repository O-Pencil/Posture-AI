/**
 * @file KinematicsModule.kt
 * @description RN 桥接模块：订阅 KinematicsHub.state 通过 DeviceEventManagerModule 发 onKinematicsUpdate 给 JS，暴露 getLatestState / setSimulationScenario 两个 @ReactMethod。
 *
 * [WHO] 提供 `class KinematicsModule(reactContext: ReactApplicationContext)`、`getName()`、`init` 协程订阅、private `sendEvent()`、`@ReactMethod getLatestState(promise)` / `setSimulationScenario(scenario)` / `addListener()` / `removeListeners()`
 * [FROM] 依赖 `com.facebook.react.bridge.*`、`KinematicsHub`、`kotlinx.coroutines.flow.collectLatest`
 * [TO] 被 `CatunePackage.createNativeModules` 注册；JS 端 `NativeModules.KinematicsModule` 与 `NativeEventEmitter` 调用
 * [HERE] android/app/src/main/java/com/catune/rn/KinematicsModule.kt · RN 桥接层
 */
package com.catune.rn

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.catune.inference.mnn.KinematicsHub
import android.util.Log
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
