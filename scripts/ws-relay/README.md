# 两台手机保底方案（WS）：iPhone 发送 · App/Web 接收

ESP32 没烧通时的保底链路：**iPhone App(姿态发送方) → Mac 中转 → Catune Web 或安卓 App 接收**。映射 **背 = Node-T**（前倾=驼背、左右倾=侧倾）。

```
iPhone App(姿态发送方)  ──ws://Mac:8787──►  server.mjs  ──ws──►  Catune Web（Desk/Monitor）
                                    └──ws──►  安卓 App（手机姿态带）
```

## 推荐用法（无需 ngrok、无需单独 receiver 页）

### 1. Mac 启动中转
```bash
cd scripts/ws-relay
npm i ws                 # 仅首次
node server.mjs
```

### 2. Mac 打开 Catune Web 当接收方（完整 App UI）
```bash
cd ../..                 # Posture-AI 根目录
npm run web              # 默认 http://localhost:8083
```
- 浏览器打开 Expo Web 地址
- **自动**连 `ws://127.0.0.1:8787`，模式为「手机姿态带」
- 看 **Desk**（猫/分数）和 **Monitor**（颈胸腰角度日志）

### 3. iPhone 当传感器
- Catune App → Settings → WS 地址填 `ws://<Mac内网IP>:8787`
- 选 **「姿态发送方」** → 开始发送 → 竖握贴背
- Mac Web 上猫和角度应随 iPhone 倾斜变化

### 4. 安卓真机（可选，与 Web 接收逻辑相同）
- Settings → **手机姿态带** → 同一 ws 地址 → **单点·背(Node-T)** → 连接 → 坐直校准

## 备选：浏览器当传感器（需 ngrok，无 App 时）

iOS Safari 只有 **HTTPS** 才允许读运动传感器：
```bash
ngrok http 8787
```
- iPhone 打开 ngrok **https** 地址（`/` 发送页）

Mac 桌面模拟：`http://localhost:8787/?mode=simulate`

## 协议（WS，JSON）

| 字段 | 含义 |
| --- | --- |
| `nodeId` | 1 = 胸 Node-T（保底单点） |
| `pitch` | 前后俯仰（°） → 胸(驼背) |
| `roll` | 左右翻滚（°） → 腰(侧倾) |

接收端 node-T 映射（`wsSensorSource.ts` / Web App 共用）：
- 胸 = pitch − baseline，腰 = roll − baseline
- 颈 = 生理曲度残余 8° + 胸椎超出 deadband 部分的 0.55 倍联动（`spineKinematics.ts`）

> 与硬件 BLE 是两条独立保底链路，最终都汇到同一个 `engine.update`。
