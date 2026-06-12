/**
 * @file sensorSource.ts
 * @description 用 expo-sensors 的 DeviceMotion 读手机真实姿态（俯仰/翻滚），喂给共享的 PostureEngine。
 *   仅在 expo-preview（SDK 54）里用；映射：beta(前后俯仰)→颈部前倾，gamma(左右翻滚)→腰部侧倾。
 *
 * [WHO] 导出 `SensorSource`、`createSensorSource(engine, intervalMs)`
 * [FROM] 依赖 `expo-sensors`(DeviceMotion)、`../src/posture/engine`(PostureEngine 类型)
 * [TO] 被 expo-preview/App.tsx 启动；不可用时由 App 回退到 mock
 * [HERE] expo-preview/sensorSource.ts · 手机 IMU 数据源
 */
import {DeviceMotion} from 'expo-sensors';
import type {PostureEngine} from '../src/posture/engine';

const RAD2DEG = 180 / Math.PI;

export type SensorSource = {
  /** 返回 true=传感器可用并已开始；false=不可用（调用方应回退 mock）。 */
  start: () => Promise<boolean>;
  stop: () => void;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function createSensorSource(engine: PostureEngine, intervalMs = 100): SensorSource {
  let sub: {remove: () => void} | null = null;

  return {
    async start(): Promise<boolean> {
      try {
        const available = await DeviceMotion.isAvailableAsync();
        if (!available) {
          return false;
        }
        const perm = await DeviceMotion.requestPermissionsAsync();
        if (perm.status !== 'granted') {
          return false;
        }
        DeviceMotion.setUpdateInterval(intervalMs);
        sub = DeviceMotion.addListener(data => {
          const r = data.rotation;
          if (!r) {
            return;
          }
          // beta: 前后俯仰（手机前倾时增大）→ 颈部前倾角
          // gamma: 左右翻滚 → 腰部侧倾角
          const neck = clamp(r.beta * RAD2DEG, -45, 60);
          const lumbar = clamp(r.gamma * RAD2DEG, -40, 40);
          engine.update(neck, lumbar);
        });
        return true;
      } catch {
        return false;
      }
    },
    stop() {
      sub?.remove();
      sub = null;
    },
  };
}
