/**
 * @file MainActivity.kt
 * @description React Native Activity 宿主，加载 MNN 原生库并暴露四元数→姿态角的 JNI 入口。
 *
 * [WHO] 提供 MainActivity（默认 RN 入口）、`calculateSpineAnglesStatic(rawQuaternions: FloatArray): FloatArray`、private `external fun calculateSpineAnglesNative`
 * [FROM] 依赖 `com.facebook.react.*`（Activity / Delegate）、`libMNN` + `libposture_ai_bridge`（`System.loadLibrary`）
 * [TO] 被 Android 启动器（`<action android:name="android.intent.action.MAIN" />`）拉起；`calculateSpineAnglesStatic` 被 `PostureAIApp` 注入到 `SpineBluetoothManager` 回调链
 * [HERE] android/app/src/main/java/com/postureai/MainActivity.kt · RN 宿主 + JNI 桩
 */
package com.postureai

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String = "PostureAI"

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
        init {
            System.loadLibrary("MNN")
            System.loadLibrary("posture_ai_bridge")
        }

        @JvmStatic
        fun calculateSpineAnglesStatic(rawQuaternions: FloatArray): FloatArray {
            return calculateSpineAnglesNative(rawQuaternions)
        }

        @JvmStatic
        private external fun calculateSpineAnglesNative(rawQuaternions: FloatArray): FloatArray
    }
}
