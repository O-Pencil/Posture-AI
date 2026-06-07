/**
 * @file CatuneApp.kt
 * @description Application 入口，初始化 React Native、SoLoader、新架构入口，并装配 PairingManager + SpineBluetoothManager 模拟流。
 *
 * [WHO] 提供 CatuneApp（Application 子类）、内部 `reactNativeHost`（`DefaultReactNativeHost`）、`pairingManager`、`bluetoothManager` 字段
 * [FROM] 依赖 `com.facebook.react.*`（SoLoader / ReactHost / PackageList）、`com.catune.pairing.PairingManager`、`com.catune.bluetooth.SpineBluetoothManager`、`com.catune.rn.CatunePackage`
 * [TO] 被 Android 启动器（`android:name=".CatuneApp"`）实例化；`pairingManager` 被 `ServiceRuntime` 读取；`CatunePackage` 被 `reactNativeHost.getPackages()` 注册
 * [HERE] android/app/src/main/java/com/catune/CatuneApp.kt · 全局应用类 + 核心装配
 */
package com.catune

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
import com.catune.rn.CatunePackage
import com.catune.pairing.PairingManager
import com.catune.bluetooth.SpineBluetoothManager
import kotlinx.coroutines.MainScope

class CatuneApp : Application(), ReactApplication {

  lateinit var pairingManager: PairingManager
    private set
    
  private lateinit var bluetoothManager: SpineBluetoothManager

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              add(CatunePackage())
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
        com.catune.MainActivity.calculateSpineAnglesStatic(raw)
    }
    bluetoothManager.startSimulation()
  }
}
