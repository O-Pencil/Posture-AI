/**
 * @file McpForegroundService.kt
 * @description 前台 Service（specialUse 类型），保活 MCP HTTP 服务；通过 LifecycleRegistry 暴露给 ServiceRuntime。
 *
 * [WHO] 提供 `class McpForegroundService: Service, LifecycleOwner`、`onCreate/onStartCommand/onDestroy/onBind`、`getRuntimeOrNull()`、private `createNotificationChannel()` / `buildNotification()` / `stopServiceInternal()`；伴生对象 `ACTION_STOP` / `CHANNEL_ID` / `NOTIFICATION_ID`
 * [FROM] 依赖 androidx.lifecycle（LifecycleRegistry）、NotificationCompat、PostureAIApp、ServiceRuntime、R.drawable.ic_notification
 * [TO] 被 Android 启动器（`<service android:name=".service.McpForegroundService" />`）调度；`runtime` 被外部读取调 `getRuntimeOrNull()`
 * [HERE] android/app/src/main/java/com/postureai/service/McpForegroundService.kt · MCP 前台服务
 */
package com.postureai.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.postureai.PostureAIApp
import com.postureai.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class McpForegroundService : Service(), androidx.lifecycle.LifecycleOwner {
    private val lifecycleRegistry = androidx.lifecycle.LifecycleRegistry(this)
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var runtime: ServiceRuntime? = null

    override val lifecycle: androidx.lifecycle.Lifecycle get() = lifecycleRegistry

    override fun onCreate() {
        super.onCreate()
        lifecycleRegistry.currentState = androidx.lifecycle.Lifecycle.State.CREATED
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopServiceInternal()
                stopSelf()
                return START_NOT_STICKY
            }
        }
        startForeground(NOTIFICATION_ID, buildNotification("MCP service running"))
        lifecycleRegistry.currentState = androidx.lifecycle.Lifecycle.State.STARTED
        lifecycleRegistry.currentState = androidx.lifecycle.Lifecycle.State.RESUMED

        val app = application as PostureAIApp
        if (runtime == null) {
            runtime = ServiceRuntime(this, app.pairingManager, this)
            serviceScope.launch {
                runtime?.start()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        stopServiceInternal()
        lifecycleRegistry.currentState = androidx.lifecycle.Lifecycle.State.DESTROYED
        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    fun getRuntimeOrNull(): ServiceRuntime? = runtime

    private fun stopServiceInternal() {
        runtime?.stop()
        runtime = null
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Eyes-on-Phone MCP",
            NotificationManager.IMPORTANCE_LOW,
        )
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .build()

    companion object {
        const val ACTION_STOP = "com.postureai.STOP"
        private const val CHANNEL_ID = "mcp_service"
        private const val NOTIFICATION_ID = 1001
    }
}
