# 两台手机保底方案（WS）：手机当姿态带

ESP32 没烧通时的保底链路：**iPhone(传感器,浏览器) → Mac 中转 → 安卓 App**。映射 **背 = Node-T**（前倾=驼背、左右倾=侧倾）。

```
iPhone 浏览器(ws-sender.html)  ──ngrok https/wss──►  Mac: server.mjs  ──ws://内网IP──►  安卓 App(wsSensorSource)
   读 DeviceOrientation                              中转广播                          engine.update(0, pitch, roll)
```

## 跑起来（Mac）
```bash
cd scripts/ws-relay
npm i ws                 # 仅首次
node server.mjs          # 启动后会打印 ws://<内网IP>:8787
```

## iPhone 当传感器（关键：iOS 强制 HTTPS）
iOS Safari 只有 **HTTPS** 才允许读运动传感器，所以发送页要走 HTTPS：
```bash
ngrok http 8787          # 另开一个终端
```
- iPhone 打开 ngrok 给的 **https 地址** → 点「开始（授权运动）」→ 允许「运动与方向」。
- 竖着贴上背、屏幕朝外。页面实时显示 `pitch / roll`，状态变「发送中」即通。

> 没有 ngrok 也可用自签 HTTPS，但 ngrok 最省事。安卓 App 是**原生**，不受 HTTPS 限制，直接用 `ws://内网IP:8787`。

## 安卓 App 接收
1. Settings → 「手机姿态带（WS）」卡片 → 填 `ws://<Mac内网IP>:8787`（server 启动时打印的那个）。
2. 选映射：**单点·背(Node-T)**（推荐，前倾=驼背/侧倾）或 **单机·演三态**（pitch 同时给颈+胸，一台手机演满三态）。
3. 点「连接」→ 状态「已连接」→ 坐直点「坐直校准」归零 → 倾身体，看 Desk 猫/分数/Monitor 日志动。

## 协议（WS，JSON）
| 字段 | 含义 |
| --- | --- |
| `nodeId` | 1 = 胸 Node-T（保底单点） |
| `pitch` | 前后俯仰（°，iOS beta） → 胸(驼背) |
| `roll` | 左右翻滚（°，iOS gamma） → 腰(侧倾) |

> 与硬件 BLE 是两条独立保底链路：BLE 走二进制四元数（[docs/BLE协议与固件.md](../../docs/BLE协议与固件.md)），WS 走 JSON 欧拉角。两者最终都汇到同一个 `engine.update`，引擎/AI/UI 零改动。
