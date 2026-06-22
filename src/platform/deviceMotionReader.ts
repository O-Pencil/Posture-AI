/**
 * @file deviceMotionReader.ts
 * @description DeviceMotion → pitch/roll（度）统一读取，供 sensor / ws 发送方共用。
 */
import {DeviceMotion} from 'expo-sensors';

const RAD2DEG = 180 / Math.PI;

function fromGravity(g: {x: number; y: number; z: number}): {pitch: number; roll: number} {
  return {
    pitch: Math.atan2(-g.y, Math.hypot(g.x, g.z)) * RAD2DEG,
    roll: Math.atan2(g.x, Math.hypot(g.y, g.z)) * RAD2DEG,
  };
}

/** 读俯仰/翻滚；优先 rotation，全零或缺失时回退加速度计。 */
export function readDevicePitchRoll(data: DeviceMotion.DeviceMotionMeasurement): {pitch: number; roll: number} | null {
  const r = data.rotation;
  if (r && (r.beta !== 0 || r.gamma !== 0 || r.alpha !== 0)) {
    return {pitch: r.beta * RAD2DEG, roll: r.gamma * RAD2DEG};
  }

  const g = data.accelerationIncludingGravity;
  if (g && (g.x !== 0 || g.y !== 0 || g.z !== 0)) {
    return fromGravity(g);
  }

  // rotation 对象存在但全零：仍尝试用 rotation（部分机型首帧为 0）
  if (r) {
    return {pitch: r.beta * RAD2DEG, roll: r.gamma * RAD2DEG};
  }

  return null;
}

export {RAD2DEG};
