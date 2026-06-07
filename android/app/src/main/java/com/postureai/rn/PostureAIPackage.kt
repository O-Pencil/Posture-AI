/**
 * @file CatunePackage.kt
 * @description ReactPackage 实现，把 KinematicsModule 注册到 RN runtime；不提供自定义 ViewManager。
 *
 * [WHO] 提供 `class CatunePackage: ReactPackage`，`createNativeModules()` 返回 `[KinematicsModule]`，`createViewManagers()` 返回空
 * [FROM] 依赖 `com.facebook.react.*`、`KinematicsModule`
 * [TO] 被 `CatuneApp.reactNativeHost.getPackages()` 添加到 PackageList
 * [HERE] android/app/src/main/java/com/catune/rn/CatunePackage.kt · RN Package 注册
 */
package com.catune.rn

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class CatunePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(KinematicsModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
