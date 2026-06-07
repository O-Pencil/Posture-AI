/**
 * @file CameraCaptureManager.kt
 * @description CameraX 绑定后摄，提供拍静止帧 + 持续分析流，给 LOOK 推理和 Watchdog 提供 JPEG 帧。
 *
 * [WHO] 提供 CameraCaptureManager、`suspend bind(lifecycleOwner)` / `unbind()`、`suspend captureFrame(maxLongEdge: Int = 768): ByteArray`、`getLatestWatchdogFrame(): ByteArray?`
 * [FROM] 依赖 androidx.camera（core/camera2/lifecycle/view 1.4.0）、`android.graphics.YuvImage`、`kotlinx.coroutines.sync.Mutex`
 * [TO] 被 `DefaultPerceptionEngine.analyze()` 调 `captureFrame()`；被 `WatchdogManager.runWatchCycle()` 调 `getLatestWatchdogFrame()`；被 `ServiceRuntime` 持有
 * [HERE] android/app/src/main/java/com/catune/capture/CameraCaptureManager.kt · 摄像头双流采集
 */
package com.catune.capture

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Matrix
import android.graphics.Rect
import android.graphics.YuvImage
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.util.concurrent.atomic.AtomicReference
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class CameraCaptureManager(
    private val context: Context,
) {
    private val mutex = Mutex()
    private var imageCapture: ImageCapture? = null
    private var imageAnalysis: ImageAnalysis? = null
    private val latestFrame = AtomicReference<ByteArray?>(null)
    private var bound = false

    suspend fun bind(lifecycleOwner: LifecycleOwner) {
        mutex.withLock {
            if (bound) return
            val provider = ProcessCameraProvider.getInstance(context).get()
            provider.unbindAll()

            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .setTargetResolution(Size(1280, 720))
                .build()

            imageAnalysis = ImageAnalysis.Builder()
                .setTargetResolution(Size(640, 480))
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also { analysis ->
                    analysis.setAnalyzer(ContextCompat.getMainExecutor(context)) { proxy ->
                        latestFrame.set(proxyToJpeg(proxy, maxLongEdge = 480))
                        proxy.close()
                    }
                }

            provider.bindToLifecycle(
                lifecycleOwner,
                CameraSelector.DEFAULT_BACK_CAMERA,
                imageCapture,
                imageAnalysis,
            )
            bound = true
        }
    }

    fun unbind() {
        val providerFuture = ProcessCameraProvider.getInstance(context)
        providerFuture.addListener({
            providerFuture.get().unbindAll()
            bound = false
            imageCapture = null
            imageAnalysis = null
            latestFrame.set(null)
        }, ContextCompat.getMainExecutor(context))
    }

    suspend fun captureFrame(maxLongEdge: Int = 768): ByteArray = mutex.withLock {
        latestFrame.get()?.let { return resizeJpegIfNeeded(it, maxLongEdge) }
        val capture = imageCapture ?: error("Camera not bound")
        withContext(Dispatchers.Main) {
            suspendCancellableCoroutine { cont ->
                val file = java.io.File.createTempFile("capture", ".jpg", context.cacheDir)
                val options = ImageCapture.OutputFileOptions.Builder(file).build()
                capture.takePicture(
                    options,
                    ContextCompat.getMainExecutor(context),
                    object : ImageCapture.OnImageSavedCallback {
                        override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                            val bytes = file.readBytes()
                            file.delete()
                            cont.resume(resizeJpegIfNeeded(bytes, maxLongEdge))
                        }

                        override fun onError(exception: ImageCaptureException) {
                            cont.resumeWithException(exception)
                        }
                    },
                )
            }
        }
    }

    fun getLatestWatchdogFrame(): ByteArray? = latestFrame.get()

    private fun proxyToJpeg(proxy: ImageProxy, maxLongEdge: Int): ByteArray {
        val yuv = yuv420ToNv21(proxy)
        val yuvImage = YuvImage(yuv, ImageFormat.NV21, proxy.width, proxy.height, null)
        val out = ByteArrayOutputStream()
        yuvImage.compressToJpeg(Rect(0, 0, proxy.width, proxy.height), 75, out)
        return resizeJpegIfNeeded(out.toByteArray(), maxLongEdge)
    }

    private fun yuv420ToNv21(image: ImageProxy): ByteArray {
        val yBuffer = image.planes[0].buffer
        val uBuffer = image.planes[1].buffer
        val vBuffer = image.planes[2].buffer
        val ySize = yBuffer.remaining()
        val uSize = uBuffer.remaining()
        val vSize = vBuffer.remaining()
        val nv21 = ByteArray(ySize + uSize + vSize)
        yBuffer.get(nv21, 0, ySize)
        vBuffer.get(nv21, ySize, vSize)
        uBuffer.get(nv21, ySize + vSize, uSize)
        return nv21
    }

    private fun resizeJpegIfNeeded(jpeg: ByteArray, maxLongEdge: Int): ByteArray {
        val bmp = BitmapFactory.decodeByteArray(jpeg, 0, jpeg.size) ?: return jpeg
        val longEdge = maxOf(bmp.width, bmp.height)
        if (longEdge <= maxLongEdge) {
            bmp.recycle()
            return jpeg
        }
        val scale = maxLongEdge.toFloat() / longEdge
        val matrix = Matrix().apply { postScale(scale, scale) }
        val scaled = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, matrix, true)
        bmp.recycle()
        val out = ByteArrayOutputStream()
        scaled.compress(Bitmap.CompressFormat.JPEG, 80, out)
        scaled.recycle()
        return out.toByteArray()
    }
}
