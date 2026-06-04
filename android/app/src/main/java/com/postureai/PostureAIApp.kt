package com.postureai

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.postureai.rn.PostureAIPackage
import com.postureai.pairing.PairingManager
import com.postureai.bluetooth.SpineBluetoothManager
import kotlinx.coroutines.MainScope

class PostureAIApp : Application(), ReactApplication {

  lateinit var pairingManager: PairingManager
    private set
    
  private lateinit var bluetoothManager: SpineBluetoothManager

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              add(PostureAIPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
    
    // Initialize Core Logic
    pairingManager = PairingManager(this)
    
    // Start Bluetooth Simulation automatically for now
    bluetoothManager = SpineBluetoothManager(this, MainScope()) { raw ->
        // Direct call to JNI for calculation
        com.postureai.MainActivity.calculateSpineAnglesStatic(raw)
    }
    bluetoothManager.startSimulation()
  }
}
