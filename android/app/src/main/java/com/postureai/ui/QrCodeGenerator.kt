/**
 * @file QrCodeGenerator.kt
 * @description ZXing 二维码生成（用于 MCP URL+Token 一键扫码配对）。
 *
 * [WHO] 提供 `object QrCodeGenerator`、`generate(text: String, size: Int = 512): Bitmap`
 * [FROM] 依赖 com.google.zxing.core 3.5.3（QRCodeWriter / BarcodeFormat）、`android.graphics.Bitmap` / `Color`
 * [TO] 被 Android 配对 UI 渲染二维码；与 PairingManager 输出配对
 * [HERE] android/app/src/main/java/com/postureai/ui/QrCodeGenerator.kt · 二维码生成
 */
package com.postureai.ui

import android.graphics.Bitmap
import android.graphics.Color
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter

object QrCodeGenerator {
    fun generate(text: String, size: Int = 512): Bitmap {
        val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, size, size)
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
        for (x in 0 until size) {
            for (y in 0 until size) {
                bmp.setPixel(x, y, if (matrix[x, y]) Color.BLACK else Color.WHITE)
            }
        }
        return bmp
    }
}
