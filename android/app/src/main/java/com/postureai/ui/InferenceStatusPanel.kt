/**
 * @file InferenceStatusPanel.kt
 * @description Compose 状态卡片：ModelStatusCard（权重/JNI 状态）+ InferenceStatusCard（TTFT/Prefill/Decode/TPS/输出预览）。
 *
 * [WHO] 提供 `@Composable ModelStatusCard(state: ModelInstallState)`、`@Composable InferenceStatusCard(status: InferenceStatus)`、private `InferencePhase.toDisplayName()`
 * [FROM] 依赖 androidx.compose.material3（Card / MaterialTheme / Text）、`ModelInstallState` / `InferenceStatus` / `InferencePhase`
 * [TO] 被 RN 端（未来 Compose 嵌入）或 Android 独立 Activity 引用；当前主要用于演示和调试
 * [HERE] android/app/src/main/java/com/catune/ui/InferenceStatusPanel.kt · 推理状态可视化
 */
package com.catune.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.catune.inference.InferencePhase
import com.catune.inference.InferenceStatus
import com.catune.inference.ModelInstallState

@Composable
fun ModelStatusCard(model: ModelInstallState) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text("Model", style = MaterialTheme.typography.titleMedium)
            Text("Status: ${model.statusLabel}")
            Text("Path: ${model.modelDir}", style = MaterialTheme.typography.bodySmall)
            Text(
                "Files: ${model.fileCount} (${"%.1f".format(model.totalSizeMb)} MB) · Native: ${if (model.nativeLibLoaded) "yes" else "stub"}",
                style = MaterialTheme.typography.bodySmall,
            )
            if (!model.weightsPresent) {
                Text(
                    "Push MNN weights via adb (see docs/model-setup.md). Until then, heuristic mode is used.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.secondary,
                )
            }
        }
    }
}

@Composable
fun InferenceStatusCard(status: InferenceStatus) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text("Inference", style = MaterialTheme.typography.titleMedium)
            Text("Phase: ${status.phase.toDisplayName()}")
            status.requestId?.let {
                Text("Request ID: $it", style = MaterialTheme.typography.bodySmall)
            }
            status.activeTool?.let { Text("Tool: $it") }
            if (status.detail.isNotBlank()) {
                Text(status.detail, style = MaterialTheme.typography.bodySmall)
            }
            if (status.ttftMs != null) {
                Text("TTFT: ${status.ttftMs} ms", style = MaterialTheme.typography.bodySmall)
            }
            status.prefillMs?.let {
                Text("Prefill: $it ms", style = MaterialTheme.typography.bodySmall)
            }
            status.decodeMs?.let {
                Text("Decode: $it ms", style = MaterialTheme.typography.bodySmall)
            }
            status.decodeTps?.let {
                Text("Decode speed: ${"%.1f".format(it)} tok/s", style = MaterialTheme.typography.bodySmall)
            }
            if (status.tokensGenerated > 0 || status.outputChars > 0) {
                Text(
                    "Tokens (engine): ${status.tokensGenerated} · Chars: ${status.outputChars}",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            status.totalMs?.let {
                Text("Total: $it ms", style = MaterialTheme.typography.bodySmall)
            }
            if (status.outputPreview.isNotBlank()) {
                Text("Model output:", style = MaterialTheme.typography.labelMedium)
                Text(
                    status.outputPreview,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private fun InferencePhase.toDisplayName(): String = when (this) {
    InferencePhase.IDLE -> "Idle"
    InferencePhase.REQUEST_RECEIVED -> "Request received"
    InferencePhase.CAPTURING -> "Capturing"
    InferencePhase.PREFILL -> "Prefill"
    InferencePhase.DECODING -> "Decoding"
    InferencePhase.COMPLETE -> "Complete"
    InferencePhase.HEURISTIC -> "Heuristic (no VL)"
    InferencePhase.ERROR -> "Error"
}
