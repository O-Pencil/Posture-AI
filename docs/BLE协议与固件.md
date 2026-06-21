# BLE 协议与固件（ESP32-S3 + BNO085 → App）

> App 侧：`src/platform/bleSensorSource.ts`（已实现）。固件：`firmware/catune_node/catune_node.ino`（骨架）。
> 两边的 UUID 与包格式**必须一致**。关联 [硬件采购与小白使用指南](./硬件采购与小白使用指南.md) · [iOS适配评估与计划](./iOS适配评估与计划.md)。

## 1. BLE 协议（单一事实来源）
| 项 | 值 |
| --- | --- |
| Service UUID | `6e401000-b5a3-f393-e0a9-e50e24dcca9e` |
| Characteristic UUID（NOTIFY） | `6e401001-b5a3-f393-e0a9-e50e24dcca9e` |
| 设备名 | `Catune-Node`（App 按 **Service UUID** 扫描，名只是辅助） |
| 包长 | 17 字节 |
| 包格式 | `[nodeId:uint8] [qw,qx,qy,qz : 4×float32 小端]` |
| nodeId | `0`=颈 C7 · `1`=胸 T12 · `2`=腰 L5 |
| 频率 | ~50Hz（固件 20ms） |

> 四元数→角度在 App 端做：`quatToPitchRoll()` → 颈/胸/腰。单节点（nodeId=1）时 pitch→胸、roll→腰；3 节点各算。校准在 App「坐直校准」记基线。

## 2. 烧录固件（Arduino IDE）
1. 装 **ESP32 板支持包**（Boards Manager → esp32 by Espressif），板选 **ESP32S3 Dev Module**。
2. 库管理器装 **Adafruit BNO08x**（BLE 用板自带 `BLEDevice`，无需额外装）。
3. 接线（最小化，单节点，不用 TCA9548A）：BNO085 `VIN→3V3`、`GND→GND`、`SDA→GPIO8`、`SCL→GPIO9`（ESP32-S3）。经典 ESP32 改 21/22 并改 `catune_node.ino` 顶部 `I2C_SDA/I2C_SCL`。开机串口会跑 **I2C 扫描**，应看到 `0x4A <- BNO085`。
4. 打开 `firmware/catune_node/catune_node.ino`，`NODE_ID` 单节点保持 `1`（胸）；编译上传。
5. 串口看到「Catune-Node 广播中…」即成功。

## 3. App 侧连接
- Settings →「数据源」→ **硬件姿态带** → 自动扫描连接（按 Service UUID）。
- 状态：扫描中/连接中/已连接；连上后坐直点「**坐直校准**」设基线。
- 连不上自动回退手机 IMU。Monitor 页能看到「传感器 输入 颈/胸/腰」实时日志（BLE 数据经同一 `engine.update`）。

## 4. 多节点（3 节点·复赛）
- 颈/胸/腰各一块 ESP32+BNO085，分别把 `NODE_ID` 烧成 `0/1/2`。
- App 已支持：按 nodeId 分别更新颈/胸/腰；3 块同时连接需固件改为多设备或单 ESP32 接 3 个 BNO085（I2C 地址/多路复用）——复赛再做。

## 5. 权限（已配 app.json）
- Android：`BLUETOOTH_SCAN/CONNECT`、`ACCESS_FINE_LOCATION`。
- iOS：`NSBluetoothAlwaysUsageDescription`。
- `react-native-ble-plx` 需 dev build：`npx expo install react-native-ble-plx` 后 `expo prebuild` 重新构建。
