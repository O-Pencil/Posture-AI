# com.catune · AGENTS.md

> 模块：Android 原生主体（Kotlin / `com.catune`）
> 协议层级：DIP · P2（模块地图）
> 父文档：[../../../AGENTS.md](../../../../../../AGENTS.md)

13 个子包 + 2 个入口类，共 31 个 Kotlin 源文件（含 ui/theme/Theme.kt）。

---

## 1. 顶层入口（com.catune）

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `MainActivity.kt` | RN Activity 宿主，启用新架构/Fabric，**`System.loadLibrary("MNN")` + `loadLibrary("posture_ai_bridge")`**，暴露 `calculateSpineAnglesNative(rawQuaternions)` 静态方法 | `DefaultReactActivityDelegate`、JNI 入口、SP 关键方法 |
| `CatuneApp.kt` | `Application` 子类，初始化 `SoLoader`、新架构 `load()`、`PairingManager`、**自动启动 `SpineBluetoothManager.startSimulation()`** | `ReactApplication`、协程 `MainScope`、Provider 装配 |

---

## 2. bluetooth/ · BLE 通讯

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `SpineBluetoothManager.kt` | 与 `PoseMaster-C6` / `Omni-Posture-Spine` 设备 BLE GATT 通讯，含 `startSimulation()`（10Hz 随机四元数）、`startBleScan()`、`processIncomingData()` 把 `byte[]` 解码为 `FloatArray` 再调 JNI 算姿态角 | `BluetoothGattCallback`、`ByteBuffer.LITTLE_ENDIAN`、`KinematicsHub.update()` 写入 |

---

## 3. capture/ · 采集层

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `CameraCaptureManager.kt` | CameraX 绑定后摄，**双流**：`ImageCapture` (1280×720) 拍静止帧 + `ImageAnalysis` (640×480) 持续给最新 JPEG 喂 watchdog；`captureFrame()`、`getLatestWatchdogFrame()`、`unbind()` | `ProcessCameraProvider`、`YuvImage` 编码、Bitmap 缩放 |
| `AudioCaptureManager.kt` | 16kHz 单声道 16-bit PCM `AudioRecord`，**10s 环形 buffer**，`sliceRecentPcm(durationSec)` 异步切片 | `AudioRecord`、线程安全 `synchronized(ringBuffer)` |

---

## 4. inference/ · 推理层（非 MNN）

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `PerceptionEngine.kt` | 多模态推理**接口**：`analyze(request)` / `lookRaw(prompt)` / `analyzeWatchdogFrame(jpeg, prompt, alertRules)` | `interface`、`isModelLoaded`、`lastInferenceMs` |
| `PerceptionModels.kt` | 可序列化数据契约：`PerceptionRequest{Mode.LOOK/LISTEN/PERCEIVE}`、`PerceptionResult`、`StructuredPerception`、`PerceivedObject`、`RawLookResult` | `kotlinx.serialization` |
| `DefaultPerceptionEngine.kt` | 编排器：捕获 → MNN 推理 → 失败回退 `HeuristicAnalyzer`；加载 `prompts/safety_prefix.txt` + `prompts/vl_system.txt` | `runBlocking`、`InferenceStatusHub` 状态推送 |
| `HeuristicAnalyzer.kt` | **无 VL 权重时的降级分析**：像素级 RGB/亮度统计，支持 `print_failed` / `led` 简易规则 | `BitmapFactory`、纯计算 |
| `InferenceStatus.kt` | `InferencePhase` 枚举（IDLE/REQUEST_RECEIVED/CAPTURING/PREFILL/DECODING/COMPLETE/HEURISTIC/ERROR）+ `InferenceStatusHub`（`StateFlow<InferenceStatus>`），TTFT/Prefill/Decode/TPS 指标 | `MutableStateFlow` |
| `ModelInstallInfo.kt` | 扫描 `filesDir/mnn_models/qwen3-vl-2b/` 检查必需权重文件，生成 `ModelInstallState`（含 `statusLabel` 给 UI 显示） | `File.listFiles`、必需 5 文件列表 |

---

## 5. inference/mnn/ · MNN 端侧推理

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `InferenceExecutor.kt` | **单线程串行化** MNN 加载/推理（`eyes-mnn-infer` 守护线程），`ensureModelLoaded(context)` 幂等加载，`loadError()` 报告 JNI 失败原因 | `Executors.newSingleThreadExecutor` + `asCoroutineDispatcher`、`AtomicBoolean` |
| `KinematicsHub.kt` | **姿态状态机**：`Posture{NORMAL/SLUMPED/TECH_NECK/LEFT_LEAN/OFFLINE}`，根据 `neckPitch`/`lumbarRoll` 自动归类，累积健康样本算 0-100 分；`getAsJson()` 给 MCP 工具用 | `StateFlow<State>`、实时统计 |
| `MnnPerceptionEngine.kt` | 桥接 Kotlin 与 JNI 的 `runInference(modelPath, imageJpeg, audioPcm, sampleRate, prompt)`、`getLastInferenceMetric(key)`、`nativeInit/Release`，加载 `libMNN` + `libeyes_mnn_bridge` | `external fun` 声明、`UnsatisfiedLinkError` 兜底 |
| `ModelOutputParser.kt` | 解析 MNN 原始输出：去 markdown 围栏 → 提取 JSON → 解析 `scene/objects/anomalies/confidence/summary` 字段 | `kotlinx.serialization.json` |

---

## 6. mcp/ · MCP 协议服务

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `McpHttpServer.kt` | **Ktor + CIO** 嵌入式 HTTP，监听 `0.0.0.0:8765`；`POST /mcp` 走 JSON-RPC 2.0 + Bearer 鉴权；`GET /mcp` 走 SSE 流；CORS 开放 | `embeddedServer(CIO)`、`JsonArray` 批处理、`notificationFlow` 推送 |
| `McpJson.kt` | MCP JSON-RPC 数据类：`JsonRpcRequest/Response/Error/Notification`；辅助 `jsonRpcResult/Error/Notification`、`JsonObject.stringArg/intArg/boolArg`、`toolTextContent` | `kotlinx.serialization` |
| `McpRequestHandler.kt` | 路由分发 `initialize` / `tools/list` / `tools/call` / `ping` + 通知；`tools/call` 委托 `McpToolRegistry` 10 个工具，含 `onProgress` 回调 | `McpSessionManager.broadcastNotification`、错误码 -32600/-32601/-32602/-32000 |
| `McpSessionManager.kt` | 维护 `mcp-session-id` → `McpSession` 映射，`notificationFlow: MutableSharedFlow<String>` 给 SSE 推送 | `ConcurrentHashMap`、`UUID` |
| `McpToolRegistry.kt` | **10 个 MCP 工具定义**：`phone_look`、`phone_listen`、`phone_perceive`、`phone_status`、`phone_watch_start/stop/list`、`phone_look_raw`、`get_body_kinematics`、`trigger_vibration_feedback` | JSON Schema 描述符、enum 约束 |

---

## 7. pairing/ · 配对与鉴权

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `PairingManager.kt` | 持久化 Bearer Token（`cat_<uuid>`）与端口（默认 8765），首次访问 token 自动生成并落 `SharedPreferences` | `SecureRandom` 替代为 UUID、prefs key `catune_pairing` |

---

## 8. rn/ · React Native 桥接

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `KinematicsModule.kt` | `KinematicsModule` RN 桥接：`init` 订阅 `KinematicsHub.state` 通过 `DeviceEventManagerModule.RCTDeviceEventEmitter` 发 `onKinematicsUpdate` 事件；`@ReactMethod` 暴露 `getLatestState(promise)`、`setSimulationScenario(scenario)`（F7 Mock Console 用） | `ReactContextBaseJavaModule`、`addListener/removeListeners` 桩方法 |
| `CatunePackage.kt` | RN `ReactPackage` 实现，把 `KinematicsModule` 注册到 RN runtime | `createNativeModules`、`createViewManagers` 返回空 |

---

## 9. service/ · 前台服务

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `McpForegroundService.kt` | Android `Service` + `LifecycleOwner`，**`specialUse` 前台服务类型**；`onStartCommand` 起 `ServiceRuntime.start()`，通知通道 `mcp_service` | `NotificationCompat`、`@drawable/ic_notification`、START_STICKY |
| `ServiceRuntime.kt` | 运行时编排：装配 `DefaultPerceptionEngine`/`WatchdogManager`/`McpHttpServer`/`McpRequestHandler`；`buildStatus()` 聚合电量/模型/推理/告警/端口/运行时长 | `BatteryManager`、`SystemClock.elapsedRealtime()` |

---

## 10. ui/ · Compose UI 与工具

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `InferenceStatusPanel.kt` | Compose `ModelStatusCard`（权重状态）+ `InferenceStatusCard`（TTFT/Prefill/Decode/TPS/输出预览） | MaterialTheme、`InferencePhase.toDisplayName()` |
| `NetworkUtils.kt` | `getLanIpAddress()`（遍历 `NetworkInterface` 找 IPv4）、`isOnWifi(context)` | `Inet4Address`、`ConnectivityManager` |
| `QrCodeGenerator.kt` | ZXing 二维码生成（用于 MCP URL+Token 一键扫码） | `QRCodeWriter` |
| `SpineVisualizer.kt` | `WebView` 加载 `file:///android_asset/threejs_spine/index.html`，`updateSpineAngles(neck, lumbar)` 通过 `evaluateJavascript` 推实时角度 | `AndroidView`、`WebChromeClient` |
| `theme/Theme.kt` | `CatuneTheme` 顶层 Composable + 私有 `DarkColors`（深色配色：主色 6EE7B7、次色 38BDF8、背景 0F172A、表面 1E293B） | `androidx.compose.material3.MaterialTheme` |

---

## 11. watchdog/ · 周期感知

| 文件 | 责任 | 技术要点 |
| --- | --- | --- |
| `PendingAlertStore.kt` | 把告警落盘 `filesDir/pending_alerts.json`（最多 20 条 FIFO），`toJson()` 给 `phone_status` 工具读 | `ListSerializer`、`@Synchronized` |
| `WatchdogManager.kt` | 管理多个 `WatchTask`（UUID 8 字符 ID），`startWatch(intervalSec, prompt, alertRules)` 起协程，**5 分钟去重**避免告警风暴，命中异常就落盘 + SSE `notifications/message` | `ConcurrentHashMap`、`delay` 循环、debounce |

---

## 12. 关键调用链

```
RN 仪表盘
  └─→ KinematicsModule（getLatestState / onKinematicsUpdate）
        └─→ KinematicsHub（StateFlow<State>）
              ↑ 写入方
              ├─ SpineBluetoothManager.processIncomingData()
              └─ KinematicsModule.setSimulationScenario()（F7）

MCP 工具调用（phone_look）
  McpHttpServer（Bearer 鉴权）→ McpRequestHandler.handleToolsCall
    → DefaultPerceptionEngine.analyze()
         → CameraCaptureManager.captureFrame() / AudioCaptureManager.sliceRecentPcm()
         → MnnPerceptionEngine.analyze()  ── JNI ──→  libMNN + eyes_mnn_bridge
         → 失败回退 → HeuristicAnalyzer.analyze()
    → McpSessionManager.broadcastNotification（onProgress）

周期感知（phone_watch_start）
  WatchdogManager.startWatch() → runWatchCycle() 循环
    → CameraCaptureManager.getLatestWatchdogFrame()
    → DefaultPerceptionEngine.analyzeWatchdogFrame()
    → 命中 anomaly → PendingAlertStore.addAlert() + SSE notifications/message
```

---

## 13. 维护纪律

- 新增子包 → 在本文件新增小节并写明入口类。
- 任何 P3 头部信息变更（导入/导出/消费方）→ 同步更新本文件的"关键调用链"。
- iOS 当前**未启用**任何原生模块，不要往 `ios/` 镜像 Kotlin 代码，等赛事复赛再决定。
