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
