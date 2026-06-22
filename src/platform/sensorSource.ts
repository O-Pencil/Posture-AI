/**
 * @file sensorSource.ts
 * @description 共享数据源：用 expo-sensors 的 DeviceMotion 读手机真实姿态，喂给 PostureEngine（3 节点：颈/胸/腰）。
 *   单手机一个 IMU 无法物理分离 3 个脊柱节点——把手机一个朝向映射成 3 路演示值；真实 3 节点来自决赛 BLE 姿态带。
 *   iOS 用 rotation(attitude)；部分安卓 rotation 为 null → 回退用 accelerationIncludingGravity 算俯仰/翻滚（几乎所有安卓机都有加速度计）。
 *   web 上 DeviceMotion 多数不可用 → start() 返回 false，调用方回退 mock。
 *
 * [WHO] 导出 `SensorSource`、`createSensorSource(engine, intervalMs)`
 * [FROM] 依赖 `expo-sensors`(DeviceMotion)、`./engine`(PostureEngine 类型)、`./deviceMotionReader`
 * [TO] 被 App.tsx 启动；不可用时由 App 回退到 mock
 * [HERE] src/platform/sensorSource.ts · 手机 IMU 数据源（3 节点映射，iOS/Android）
 */
import {DeviceMotion} from 'expo-sensors';
import type {PostureEngine} from '../posture/engine';
import {orientationToNodes} from '../posture/postureMapping';
import {readDevicePitchRoll} from './deviceMotionReader';

export type SensorSource = {
  /** 返回 true=传感器可用并已开始；false=不可用（调用方应回退 mock）。 */
  start: () => Promise<boolean>;
  stop: () => void;
};

/** 把前后俯仰/左右翻滚（度）写入引擎的 3 节点。几何见 postureMapping：竖直=挺直、前倾=驼背、平放=坏。 */
function feed(engine: PostureEngine, pitchDeg: number, rollDeg: number): void {
  const {neck, thor, lumbar} = orientationToNodes(pitchDeg, rollDeg);
  engine.update(neck, thor, lumbar);
}

export function createSensorSource(engine: PostureEngine, intervalMs = 100): SensorSource {
  let sub: {remove: () => void} | null = null;

  const stop = () => {
    sub?.remove();
    sub = null;
  };

  return {
    async start(): Promise<boolean> {
      stop();
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
          const angles = readDevicePitchRoll(data);
          if (!angles) {
            return;
          }
          feed(engine, angles.pitch, angles.roll);
        });
        return true;
      } catch {
        stop();
        return false;
      }
    },
    stop,
  };
}
