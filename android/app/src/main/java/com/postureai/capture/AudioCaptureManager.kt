/**
 * @file AudioCaptureManager.kt
 * @description 16kHz 单声道 PCM 录音，把最近 10 秒音频维护成环形 buffer，给 VL 推理提供切片。
 *
 * [WHO] 提供 AudioCaptureManager、`start()` / `stop()`、`suspend sliceRecentPcm(durationSec: Int): ByteArray`、`getSampleRate(): Int`
 * [FROM] 依赖 `android.media.AudioRecord`（MIC、16kHz、PCM_16BIT）、`kotlinx.coroutines.Dispatchers.IO`
 * [TO] 被 `DefaultPerceptionEngine.analyze()`（LOOK/LISTEN/PERCEIVE 三种模式）、`ServiceRuntime.audioCaptureManager` 持有
 * [HERE] android/app/src/main/java/com/catune/capture/AudioCaptureManager.kt · 音频采集与环形缓冲
 */
package com.catune.capture

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import kotlin.math.min

class AudioCaptureManager {
    private val sampleRate = 16_000
    private val channelConfig = AudioFormat.CHANNEL_IN_MONO
    private val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    private val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        .coerceAtLeast(sampleRate * 2)

    @Volatile
    private var recording = false
    private var audioRecord: AudioRecord? = null
    private val ringBuffer = ByteArray(sampleRate * 2 * 10) // ~10s mono 16-bit
    private var writePos = 0

    fun start() {
        if (recording) return
        val record = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            channelConfig,
            audioFormat,
            bufferSize,
        )
        if (record.state != AudioRecord.STATE_INITIALIZED) {
            record.release()
            return
        }
        audioRecord = record
        recording = true
        record.startRecording()
        Thread {
            val chunk = ByteArray(bufferSize)
            while (recording) {
                val read = record.read(chunk, 0, chunk.size)
                if (read > 0) {
                    synchronized(ringBuffer) {
                        for (i in 0 until read) {
                            ringBuffer[writePos] = chunk[i]
                            writePos = (writePos + 1) % ringBuffer.size
                        }
                    }
                }
            }
        }.start()
    }

    fun stop() {
        recording = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }

    suspend fun sliceRecentPcm(durationSec: Int): ByteArray = withContext(Dispatchers.IO) {
        val bytesNeeded = sampleRate * 2 * durationSec.coerceIn(1, 10)
        synchronized(ringBuffer) {
            val out = ByteArrayOutputStream(bytesNeeded)
            val available = min(bytesNeeded, ringBuffer.size)
            var readPos = (writePos - available + ringBuffer.size) % ringBuffer.size
            var remaining = available
            while (remaining > 0) {
                out.write(ringBuffer[readPos].toInt())
                readPos = (readPos + 1) % ringBuffer.size
                remaining--
            }
            out.toByteArray()
        }
    }

    fun getSampleRate(): Int = sampleRate
}
