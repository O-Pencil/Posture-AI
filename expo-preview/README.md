# Catune 传感器预览（Expo SDK 54）

> 用途：在 **iPhone（Expo Go SDK 54）** 上扫码测「手机 IMU → 姿态评估」效果，**免 Mac、免安卓机、免硬件**。
> 关系：独立于主工程（主工程是 RN 0.76 + 安卓 MNN 线，决赛用）；本预览**复用**主工程 `../src/posture/` 的纯 TS 引擎，逻辑单一来源。

## 为什么是独立的一个 app

Expo Go 版本锁定 SDK——你手机是 **SDK 54（= RN 0.81 / React 19）**，而主工程是 RN 0.76。把主工程强升会动到安卓 MNN/SME2 线，风险大。所以这里单独建一个 SDK 54 小应用，只共享与 RN 版本无关的纯 TS 逻辑（`engine.ts` / `types.ts` / `mock.ts`）。

## 运行（在你的 Windows 机器上）

```bash
cd expo-preview
npm install
npx expo install --fix    # 关键：把 react / react-native / expo-sensors 对齐到 SDK 54 的正确版本
npx expo start            # 终端出现二维码
```

1. iPhone 装 **Expo Go**（确认是 SDK 54 那一版）。
2. 手机与电脑同一 Wi-Fi（公司/学校网络隔离时用 `npx expo start --tunnel`）。
3. iPhone 用**相机**扫二维码 → 在 Expo Go 打开。
4. 首次弹「运动与健身」权限请**允许**。
5. **前后/左右倾斜手机**，看分数、状态、建议实时变化。

## 数据来源

- 进入后优先用**手机传感器**（`expo-sensors` 的 `DeviceMotion`）：beta(前后俯仰)→颈部前倾，gamma(左右翻滚)→腰部侧倾。
- 传感器不可用（如模拟器）→ 自动回退到主工程同一套 **mock** 10Hz 流。
- 界面上可手动切「传感器 / 模拟」。

## 边界

- 这是 UI + 规则逻辑的真机预览，**不含端侧 Qwen+MNN**（那是原生模块，决赛在安卓真机上跑）。
- 共享逻辑改在主工程 `../src/posture/`，这里自动生效（metro `watchFolders`），不要在本目录复制一份。
- 未在本机验证构建（无 Mac/无法跑 npx）；以你机器 `npx expo start` 为准，报错贴回即可。
