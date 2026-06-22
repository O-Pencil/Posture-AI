/**
 * @file spineKinematics.ts
 * @description 单点背传感器 (Node-T) → 颈/胸/腰三节点估计。
 *   校准后 thor=0 为「坐直」；颈保留生理曲度残余，并随胸椎后凸按 kinematic coupling 联动。
 *
 * 参考（坐位、相对个人基线）：
 * - 正常 cervical lordosis 在 IMU pitch 轴上约 +8°（低于 TECH_NECK 20° 阈值）
 * - 驼背时头颈前倾与胸椎后凸耦合，比例约 0.55（每 +10° 胸 ≈ +5.5° 颈）
 */
import {clamp} from './utils';

export const SPINE_KINEMATICS = {
  /** 坐直校准后保留的生理颈曲度（非异常头前倾）。 */
  normalNeckRestDeg: 8,
  /** 胸椎 pitch 超出 deadband 后，颈椎预估增益。 */
  neckThorCoupling: 0.55,
  /** 胸椎小幅波动不计入颈联动（降噪）。 */
  thorDeadbandDeg: 2,
  /** 胸椎后伸时颈曲度略减的耦合（上背挺直 → 头略收）。 */
  neckExtensionCoupling: 0.3,
};

/** 由胸椎相对 pitch 推算颈椎前倾（度）。 */
export function inferNeckFromThor(thorPitchDeg: number): number {
  const {normalNeckRestDeg, neckThorCoupling, thorDeadbandDeg, neckExtensionCoupling} = SPINE_KINEMATICS;

  if (thorPitchDeg < 0) {
    return clamp(normalNeckRestDeg + thorPitchDeg * neckExtensionCoupling, 0, normalNeckRestDeg);
  }

  const excess = Math.max(0, thorPitchDeg - thorDeadbandDeg);
  return clamp(normalNeckRestDeg + excess * neckThorCoupling, 0, 45);
}

/** Node-T 单点：pitch→胸、roll→腰，颈由胸推算。 */
export function mapNodeTToSpine(
  thorPitchDeg: number,
  lumbarRollDeg: number,
): {neckPitch: number; thorPitch: number; lumbarRoll: number} {
  return {
    neckPitch: inferNeckFromThor(thorPitchDeg),
    thorPitch: thorPitchDeg,
    lumbarRoll: lumbarRollDeg,
  };
}
