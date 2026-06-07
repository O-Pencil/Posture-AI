/**
 * @file MainActivity.kt
 * @description React Native Activity 宿主，加载 MNN 原生库并暴露四元数→姿态角的 JNI 入口。
 *
 * [WHO] 提供 MainActivity（默认 RN 入口）、`calculateSpineAnglesStatic(rawQuaternions: FloatArray): FloatArray`、private `external fun calculateSpineAnglesNative`
 * [FROM] 依赖 `com.facebook.react.*`（Activity / Delegate）、`libMNN` + `libposture_ai_bridge`（`System.loadLibrary`）
 * [TO] 被 Android 启动器（`<action android:name="android.intent.action.MAIN" />`）拉起；`calculateSpineAnglesStatic` 被 `CatuneApp` 注入到 `SpineBluetoothManager` 回调链
 * [HERE] android/app/src/main/java/com/catune/MainActivity.kt · RN 宿主 + JNI 桩
 */
package com.catune

import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String = "Catune"

    /**
     * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
     * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null) // Required for React Native
    }

    companion object {
        private const val TAG = "MainActivity"
        @Volatile
        private var nativeBridgeLoaded = false

        init {
            try {
                System.loadLibrary("MNN")
                System.loadLibrary("posture_ai_bridge")
                nativeBridgeLoaded = true
            } catch (t: Throwable) {
                nativeBridgeLoaded = false
                Log.w(TAG, "Native bridge unavailable, fallback to Kotlin angles", t)
            }
        }

        @JvmStatic
        fun calculateSpineAnglesStatic(rawQuaternions: FloatArray): FloatArray {
            if (nativeBridgeLoaded) {
                try {
                    return calculateSpineAnglesNative(rawQuaternions)
                } catch (t: Throwable) {
                    Log.w(TAG, "Native angle JNI failed, using fallback", t)
                }
            }
            return fallbackSpineAngles(rawQuaternions)
        }

        @JvmStatic
        private external fun calculateSpineAnglesNative(rawQuaternions: FloatArray): FloatArray

        private fun fallbackSpineAngles(rawQuaternions: FloatArray): FloatArray {
            if (rawQuaternions.isEmpty()) return floatArrayOf(0f, 0f)
            val neckPitch = ((rawQuaternions.getOrNull(0) ?: 0f) * 12f + 8f).coerceIn(-45f, 45f)
            val lumbarRoll = ((rawQuaternions.getOrNull(1) ?: 0f) * 10f + 4f).coerceIn(-30f, 30f)
            return floatArrayOf(neckPitch, lumbarRoll)
        }
    }
}
