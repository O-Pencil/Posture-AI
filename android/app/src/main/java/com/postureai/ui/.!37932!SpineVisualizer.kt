/**
 * @file SpineVisualizer.kt
 * @description Compose `AndroidView` 嵌入 WebView，加载 assets/threejs_spine/index.html 渲染 3D 脊柱，update 时通过 evaluateJavascript 推实时角度。
 *
 * [WHO] 提供 `@Composable SpineVisualizer(angles: FloatArray, modifier)`
 * [FROM] 依赖 androidx.compose.runtime、AndroidView、`android.webkit.WebView` / `WebChromeClient`、assets 资源 `threejs_spine/index.html`
 * [TO] 被 Android UI 嵌入用于演示 3D 脊柱随 KinematicsHub 实时变化
 * [HERE] android/app/src/main/java/com/catune/ui/SpineVisualizer.kt · 3D 脊柱可视化（WebView）
 */
package com.catune.ui

import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

import android.util.Log
import android.webkit.WebChromeClient
import android.webkit.ConsoleMessage

@Composable
fun SpineVisualizer(angles: FloatArray, modifier: Modifier = Modifier) {
    AndroidView(
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.allowFileAccess = true
                settings.allowContentAccess = true
                
                webChromeClient = object : WebChromeClient() {
                    override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                        Log.d("SpineVisualizer", "${consoleMessage?.message()} -- From line ${consoleMessage?.lineNumber()} of ${consoleMessage?.sourceId()}")
                        return true
                    }
                }
                
                webViewClient = WebViewClient()
                loadUrl("file:///android_asset/threejs_spine/index.html")
            }
        },
        update = { webView ->
