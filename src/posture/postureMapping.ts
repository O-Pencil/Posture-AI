/**
 * @file postureMapping.ts
 * @description 单手机一个朝向 → 颈/胸/腰三节点角度的「几何映射」单一来源。供 sensorSource(直连 IMU)、
 *   wsSensorSource(WS 接收)、wsSenderSource(WS 发送) 共用，保证所有路径几何一致。
 *
 *   两层职责：
 *     1) 几何（本文件）：原始朝向 → 相对「坐直」的前倾量/侧倾量。
 *        约定（与引擎阈值对齐：thor>15=驼背、neck>20=头前倾、|lumbar|>10=侧倾，正值=前倾）：
 *          - 手机竖直 pitch≈90° = 挺直背 → 前倾量 fwd≈0（好）
 *          - 前倾（pitch 变小、趋平放）   → fwd 变正、增大（驼背/低头）
 *          - 平放 pitch≈0°                → fwd≈+90（严重前倾=坏）
 *          - 后仰（pitch>90）             → fwd 负值（不罚）
 *        即 fwd = baselinePitch − pitch（baselinePitch 默认 90，「坐直校准」会覆盖）；side = roll − baselineRoll。
 *     2) 脊柱运动学（spineKinematics）：fwd → 颈椎前倾（含生理颈曲度 + 胸椎后凸耦合）。
 *
 * [WHO] 导出 `UPRIGHT_PITCH_DEG`、`orientationToNodes`
 * [FROM] 依赖 ./utils(clamp)、./spineKinematics(mapNodeTToSpine)
 * [TO] 被 src/platform/sensorSource.ts、wsSensorSource.ts、wsSenderSource.ts 消费
 * [HERE] src/posture/postureMapping.ts · 朝向→三节点几何映射（单一来源）
 */
import {clamp} from './utils';
import {mapNodeTToSpine} from './spineKinematics';

/** 手机竖直（pitch≈90°）= 挺直背 的参考角。 */
export const UPRIGHT_PITCH_DEG = 90;

/** 单手机模拟：侧倾(腰椎)也让颈椎略前倾，使颈椎跟随「整体脊柱姿态」而非只看胸椎。 */
const NECK_LATERAL_COUPLING = 0.2;

export function orientationToNodes(
  pitchDeg: number,
  rollDeg: number,
  baselinePitch: number = UPRIGHT_PITCH_DEG,
  baselineRoll = 0,
): {neck: number; thor: number; lumbar: number} {
  const fwd = clamp(baselinePitch - pitchDeg, -20, 60); // 前倾为正：竖直=0，平放≈+90
  const side = clamp(rollDeg - baselineRoll, -45, 45); // 左右侧倾
  // 脊柱运动学：胸=前倾量；颈=生理曲度 + 胸椎耦合(矢状面) + 腰椎侧倾的小幅联动(单手机模拟)
  const spine = mapNodeTToSpine(fwd, side);
  const neck = clamp(spine.neckPitch + Math.abs(side) * NECK_LATERAL_COUPLING, 0, 45);
  return {neck, thor: spine.thorPitch, lumbar: spine.lumbarRoll};
}
