/**
 * @file Theme.kt
 * @description Compose 主题：深色配色（绿/蓝主色 + 深蓝背景），所有 Compose 屏幕的 MaterialTheme 包装。
 *
 * [WHO] 提供 `private val DarkColors`（深色 ColorScheme）、`@Composable fun PostureAITheme(content: @Composable () -> Unit)`
 * [FROM] 依赖 androidx.compose.material3（MaterialTheme / darkColorScheme）、`androidx.compose.ui.graphics.Color`
 * [TO] 被 Android Compose UI（如未来要嵌入到 RN 侧或独立 Activity）作为根主题包装
 * [HERE] android/app/src/main/java/com/postureai/ui/theme/Theme.kt · Compose 深色主题
 */
package com.postureai.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColors = darkColorScheme(
    primary = Color(0xFF6EE7B7),
    secondary = Color(0xFF38BDF8),
    background = Color(0xFF0F172A),
    surface = Color(0xFF1E293B),
)

@Composable
fun PostureAITheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = DarkColors, content = content)
}
