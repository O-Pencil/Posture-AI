/**
 * @file PairingManager.kt
 * @description 持久化 Bearer Token (cat_<uuid>) 与服务端口 (默认 8765)，首次访问 token 自动生成。
 *
 * [WHO] 提供 `class PairingManager(context)`、`bearerToken: String`（getter 懒生成）、`serverPort: Int`（getter/setter）、`regenerateToken(): String`；伴生对象 `DEFAULT_PORT=8765`
 * [FROM] 依赖 `android.content.Context` + `getSharedPreferences("catune_pairing", MODE_PRIVATE)`、`java.util.UUID`
 * [TO] 被 `CatuneApp.onCreate()` 实例化；被 `ServiceRuntime` 读取 token 和端口启动 `McpHttpServer`
 * [HERE] android/app/src/main/java/com/catune/pairing/PairingManager.kt · 配对鉴权存储
 */
package com.catune.pairing

import android.content.Context
import java.security.SecureRandom
import java.util.UUID

class PairingManager(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    val bearerToken: String
        get() = prefs.getString(KEY_TOKEN, null) ?: generateAndStoreToken()

    var serverPort: Int
        get() = prefs.getInt(KEY_PORT, DEFAULT_PORT)
        set(value) = prefs.edit().putInt(KEY_PORT, value).apply()

    fun regenerateToken(): String {
        val token = "cat_${UUID.randomUUID().toString().replace("-", "")}"
        prefs.edit().putString(KEY_TOKEN, token).apply()
        return token
    }

    private fun generateAndStoreToken(): String = regenerateToken()

    companion object {
        const val DEFAULT_PORT = 8765
        private const val PREFS_NAME = "catune_pairing"
        private const val KEY_TOKEN = "bearer_token"
        private const val KEY_PORT = "server_port"
    }
}
