/**
 * @file SpineBluetoothManager.kt
 * @description BLE GATT 客户端，与 PoseMaster-C6 / Omni-Posture-Spine 脊柱传感器通讯；内置 10Hz 模拟数据流用于演示。
 *
 * [WHO] 提供 SpineBluetoothManager、`startSimulation()` / `stopSimulation()` / `startBleScan()` / `disconnect()`、`processIncomingData(ByteArray)`、内部 `gattCallback`；伴生对象暴露 `SERVICE_UUID` / `CHAR_UUID` / `CCCD_UUID`
 * [FROM] 依赖 `android.bluetooth.*`（BluetoothManager / ScanCallback / BluetoothGattCallback）、`com.catune.inference.mnn.KinematicsHub`、JNI `calculateAngles` 回调
 * [TO] 被 `CatuneApp.onCreate()` 实例化并调 `startSimulation()`；`KinematicsHub.update(neck, lumbar)` 写入姿态状态
 * [HERE] android/app/src/main/java/com/catune/bluetooth/SpineBluetoothManager.kt · BLE 模拟与真实数据入口
 */
package com.catune.bluetooth

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.Context
import android.util.Log
import com.catune.inference.mnn.KinematicsHub
import kotlinx.coroutines.*
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.*
import kotlin.random.Random

class SpineBluetoothManager(
    private val context: Context,
    private val scope: CoroutineScope,
    private val calculateAngles: (FloatArray) -> FloatArray
) {
    private var isSimulating = false
    private var bluetoothGatt: BluetoothGatt? = null
    
    private val bluetoothAdapter: BluetoothAdapter? by lazy {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        manager.adapter
    }

    companion object {
        private const val TAG = "SpineBluetooth"
        val SERVICE_UUID: UUID = UUID.fromString("4fafc201-1fb5-459e-8fcc-c5c9c331914b")
        val CHAR_UUID: UUID = UUID.fromString("beb5483e-36e1-4688-b7f5-ea07361b26a8")
        val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    }

    fun startSimulation() {
        if (isSimulating) return
        isSimulating = true
        scope.launch(Dispatchers.Default) {
            while (isActive && isSimulating) {
                delay(100)
                val mockRaw = FloatArray(8) { Random.nextFloat() }
                val angles = calculateAngles(mockRaw)
                if (angles.size >= 2) {
                    Log.d(TAG, "SIM DATA: Neck=${angles[0]}, Lumbar=${angles[1]}")
                    KinematicsHub.update(angles[0], angles[1])
                }
            }
        }
    }

    fun stopSimulation() {
        isSimulating = false
    }

    @SuppressLint("MissingPermission")
    fun startBleScan() {
        val scanner = bluetoothAdapter?.bluetoothLeScanner ?: return
        Log.d(TAG, "Starting BLE Scan...")
        
        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val deviceName = result.device.name
                if (deviceName == "PoseMaster-C6" || deviceName == "Omni-Posture-Spine") {
                    Log.d(TAG, "FOUND DEVICE: ${result.device.address}, stop scan and connecting...")
                    scanner.stopScan(this)
                    connectToDevice(result.device)
                }
            }
            override fun onScanFailed(errorCode: Int) {
                Log.e(TAG, "Scan failed with error: $errorCode")
            }
        }
        scanner.startScan(callback)
    }

    @SuppressLint("MissingPermission")
    private fun connectToDevice(device: BluetoothDevice) {
        bluetoothGatt = device.connectGatt(context, false, gattCallback)
    }

    private val gattCallback = object : BluetoothGattCallback() {
        @SuppressLint("MissingPermission")
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED) {
                Log.i(TAG, "Connected to GATT server. Starting service discovery...")
                gatt.discoverServices()
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                Log.i(TAG, "Disconnected from GATT server.")
                bluetoothGatt = null
            }
        }

        @SuppressLint("MissingPermission")
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                val service = gatt.getService(SERVICE_UUID)
                val characteristic = service?.getCharacteristic(CHAR_UUID)
                if (characteristic != null) {
                    Log.i(TAG, "Service and Characteristic found. Subscribing...")
                    gatt.setCharacteristicNotification(characteristic, true)
                    
                    val descriptor = characteristic.getDescriptor(CCCD_UUID)
                    descriptor.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                    gatt.writeDescriptor(descriptor)
                }
            } else {
                Log.w(TAG, "onServicesDiscovered received: $status")
            }
        }

        @Deprecated("Deprecated in Java")
        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            val data = characteristic.value
            processIncomingData(data)
        }

        // For modern APIs
        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic, value: ByteArray) {
            processIncomingData(value)
        }
    }

    private fun processIncomingData(data: ByteArray) {
        if (data.size < 8) return // Need at least 2 floats
        
        val floatCount = data.size / 4
        val rawFloats = FloatArray(floatCount)
        val buffer = ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN)
        
        for (i in 0 until floatCount) {
            rawFloats[i] = buffer.float
        }

        val angles = calculateAngles(rawFloats)
        if (angles.size >= 2) {
            Log.d(TAG, "REAL DATA: Neck=${angles[0]}, Lumbar=${angles[1]}")
            KinematicsHub.update(angles[0], angles[1])
        }
    }

    @SuppressLint("MissingPermission")
    fun disconnect() {
        bluetoothGatt?.disconnect()
        bluetoothGatt?.close()
        bluetoothGatt = null
    }
}
