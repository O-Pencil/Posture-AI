# Posture-AI 原型 · 功能 / 交互映射表

> 版本：v0.2 · 2026-06-05
> 范围：9 个 2C APP 端页面 × 用户动作 × APP 响应
> 阅读对象：前端 / 后端 / 嵌入式 / 产品 / 设计 5 角色

---

## 总览：核心交互循环

```
[开箱配对]  →  [日常监测]  →  [异常告警/振动]  →  [MCP 远程]  →  [周报复盘]
   ↓              ↓                ↓                 ↓              ↓
 首次配置       live 数据        设备联动           PC 智能体       数据沉淀
```

---

## 1. 首次启动流（开箱 → 校准 → 上手）

| 步骤 | 页面 | 用户动作 | APP 响应 | 涉及硬件 / 服务 |
| --- | --- | --- | --- | --- |
| 1.1 | `dashboard-empty.html` | 看 3 步引导卡 | 视觉引导，无自动跳转 | — |
| 1.2 | `dashboard-empty.html` | 点 **开始扫描配对 →** | 跳转到 `pairing.html` | — |
| 1.3 | `pairing.html` | 看雷达扫描动画 | 2 秒后自动"发现 1 台" | BLE 扫描 (`bluetoothManager.startBleScan()`) |
| 1.4 | `pairing.html` | 点 **PoseMaster-C6** 推荐项 | 跳转到 `calibration.html` | BLE 配对 + 信任 (`onServicesDiscovered`) |
| 1.5 | `calibration.html` | 按提示摆姿势 | "我保持好了"按钮启用 | 3 个 IMU 节点采集基线四元数 |
| 1.6 | `calibration.html` | 点 **我保持好了** | 推进到 STEP X/9，9 步后跳转 `dashboard.html` | `KinematicsHub` 写入 baseline |

---

## 2. 日常监测流（dashboard + 自动后台）

| 触发 | 页面 | APP 响应 | 涉及模块 |
| --- | --- | --- | --- |
| BLE 节点每 100ms 上报四元数 | `dashboard.html` | 3 节点角度实时更新（±0.3° 抖动模拟） | `SpineBluetoothManager` → `KinematicsHub` |
| 角度跨阈值 | `dashboard.html` | 状态徽章变红 / 琥珀，自动触发振动 | `DefaultPerceptionEngine.analyze()` |
| 用户点板子状态条 | `dashboard.html` | 跳转到 `settings.html` 设备详情 | — |
| 用户点 **START MCP SERVICE** | `dashboard.html` | 跳转到 `mcp-service.html` | `McpForegroundService.startForegroundService` |
| 用户点 **重新校准 →** | `dashboard.html` | 跳转到 `calibration.html` STEP 1/9 | — |
| 用户点快捷栏 4 入口 | `dashboard.html` | 跳到对应页 | — |
| 振动反馈开关 | `dashboard.html` | 通过 L5 节点马达触发（原型：toggle 状态） | BLE 写命令 |
| 24 小时热力条 hover | `dashboard.html` | 暂未实现：可展示该小时详情 | — |

---

## 3. 校准流（calibration 9 步）

| 用户动作 | APP 响应 | 数据写入 |
| --- | --- | --- |
| 看 STEP X/9 头部 | 进度条第 X 段变橙 | — |
| 保持姿势 3 秒 | 倒计时环跑完后启用"我保持好了" | — |
| 点 **我保持好了** | STEP+1，3 节点实时角度刷新 | `KinematicsHub` baseline 更新 |
| 点 **跳过此步** | 同上（不校验质量） | baseline 标记为"不完整" |
| STEP 9/9 完成 | 按钮变"进入仪表盘" | 触发 `dashboard.html` 跳转 |

---

## 4. 演示控制台（mock-console）

| 用户动作 | APP 响应 | 联动效果 |
| --- | --- | --- |
| 点 5 场景之一 | 该按钮高亮 + 右侧 CURRENT OUTPUT 全部更新 | C7/T12/L5 角度 + Score + 状态徽章颜色 + 数字 flash 动画 |
| 数字变化 | 200ms scale(1.08) + 250ms color transition | 视觉确认"数据已切换" |
| 选中 NORMAL | 按钮 `ring-status-healthy/40` + "已选"标记 | — |
| 选中 OFFLINE | 数字变 `--`，状态徽章变灰 | 模拟"传感器断开" |

---

## 5. 设备管理（settings）

| 用户动作 | APP 响应 | 涉及模块 |
| --- | --- | --- |
| 访问 settings | 顶部固定显示"当前板子"卡片 | 持久化 (`SharedPreferences`) |
| 开关：振动反馈 | toggle on/off 状态 | `ServiceRuntime` 配置 |
| 开关：系统通知 | toggle on/off 状态 | `NotificationCompat` 通道 |
| 开关：日终小结 | toggle on/off 状态 | `WorkManager` 调度 |
| 重新配对 | 跳转到 `pairing.html` | 解除旧绑定 + 重新扫描 |
| 校准 | 跳转到 `calibration.html` | 重新采集基线 |
| 解绑 | 弹确认 → 删除 `SharedPreferences` 记录 | — |
| 3 节点列表 | 展示每节点电量 + 信号 dBm | 节点状态轮询 |
| AI 模型 安装 | adb push 引导 + 进度条 | `ModelInstallChecker` |
| MCP 服务卡片 | 跳转到 `mcp-service.html` | — |

---

## 6. MCP 服务（mcp-service）

| 状态 | 显示 | 用户动作 |
| --- | --- | --- |
| 已停止 | 灰徽章"已停止" | 点 "启动" → 启动前台服务 |
| 启动中 | 灰徽章"启动中..." | — |
| 运行中 | 绿徽章"服务运行中" + URL + 1 client + 4h12m | 扫码 / 复制 URL / 复制 Token / 停止服务 |
| 复制 URL | clipboard 写入 + 短暂 toast | `navigator.clipboard.writeText` |
| 重新生成 Token | 二次确认 → 删除旧 token → 生成新 `eop_<uuid>` | `PairingManager.regenerateToken()` |
| 停止 | 服务关 → 通知栏消失 | `McpForegroundService.stopServiceInternal()` |

---

## 7. 周期感知（watchdog）

| 用户动作 | APP 响应 | 涉及模块 |
| --- | --- | --- |
| 看运行中任务列表 | 实时状态点 + 已运行时长 | `WatchdogManager` |
| 看最近告警 | 时间倒序列表 | `PendingAlertStore.loadAll()` |
| 点 **新建巡检任务** | 跳到新建表单页（原型未实现，预留） | `McpRequestHandler.handleToolsCall("phone_watch_start")` |

---

## 8. 报告（report）

| 用户动作 | APP 响应 | 数据范围 |
| --- | --- | --- |
| 点 **日/周/月** 标签 | 切换数据集（原型：仅样式切换） | 折线图 + 异常分布 + AI 建议 |
| 折线图 hover | 显示该日分数（原型：未实现） | — |
| AI 建议卡片 | 文心/端侧 MNN 生成的总结 | `phone_status` 工具的 raw_output 字段 |

---

## 9. 配对流（pairing）

| 用户动作 | APP 响应 | 涉及模块 |
| --- | --- | --- |
| 进入页面 | 雷达扫描动画 + "扫描中" | `ScanCallback.onScanResult()` |
| 2 秒后 | 自动"发现 2 台"，更新设备列表 | 模拟 BLE 扫描 |
| 看到推荐项 `PoseMaster-C6` | 绿框 + "推荐"徽章 | 匹配 MAC 地址前缀 |
| 点推荐项 | 跳转到 `calibration.html` | `connectGatt` + 配对 + 信任 |
| 展开"找不到我的板子？" | 故障排查 4 步 | — |

---

## 跨页面状态依赖

```
SharedPreferences (设备持久化)
  ├── bearer_token       ← PairingManager
  ├── server_port        ← PairingManager (default 8765)
  ├── calibration_baseline (3 节点 × 9 姿势)
  └── last_connected_device

RuntimeState
  ├── KinematicsHub (StateFlow)        ← 3 节点实时角度
  ├── InferenceStatusHub (StateFlow)   ← 推理阶段
  ├── WatchdogManager.watches          ← Map<id, task>
  └── PendingAlertStore                ← 落盘 20 条 FIFO
```

---

## 错误与边界态

| 场景 | 页面 | 表现 |
| --- | --- | --- |
| BLE 断开 | dashboard | 板子状态条变红 + "已断开" 徽章 + 显示最后已知角度 |
| 板子电量 < 10% | dashboard + settings | 状态条变琥珀 + 设置里"电量"卡片高亮 |
| MCP 客户端 0 | mcp-service | "客户端：0" 灰字，仍可启动服务 |
| 校准数据损坏 | calibration | 提示"基线缺失，请重新校准" + 一键重置 |
| 板子固件过期 | settings | 固件卡片显示"可更新 v1.2.4" + 灰按钮（未来 OTA） |
| 端侧 MNN 未安装 | mcp-service + dashboard | `phone_look/listen` 返回 `degraded_mode: true`，UI 不阻塞 |

---

## 暂未原型化（按 PRD v1.9 列入下期）

- F8 端侧 TFLite 分类器（已被 F9 MNN 取代）
- iOS 端界面（赛事复赛再做）
- PC 端 LLM 智能体（Claude Code / Codex）侧的 Tool UI
- 桌面小组件 / 持续通知
- 游戏化：植物 + streak + 徽章（v1.4 引入，初赛不做）
