/**
 * @file NetworkUtils.kt
 * @description 网络工具：获取 LAN IPv4 地址、判断当前是否走 WiFi（用于 MCP 客户端连接提示）。
 *
 * [WHO] 提供 `object NetworkUtils`、函数 `getLanIpAddress(): String`、`isOnWifi(context: Context): Boolean`
 * [FROM] 依赖 `android.net.ConnectivityManager` / `NetworkCapabilities`、`java.net.NetworkInterface` / `Inet4Address`
 * [TO] 被 Android UI 读取用于显示配对二维码 URL；可被 ServiceRuntime 扩展
 * [HERE] android/app/src/main/java/com/catune/ui/NetworkUtils.kt · 网络工具
 */
package com.catune.ui

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import java.net.Inet4Address
import java.net.NetworkInterface

object NetworkUtils {
    fun getLanIpAddress(): String {
        return NetworkInterface.getNetworkInterfaces().toList()
            .flatMap { it.inetAddresses.toList() }
            .filter { !it.isLoopbackAddress && it is Inet4Address }
            .map { it.hostAddress }
            .firstOrNull() ?: "127.0.0.1"
    }

    fun isOnWifi(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
    }
}
