/**
 * @file catAnchors.ts
 * @description 猫脊柱传感器点位的「逐帧锚点」标定表。坐标为猫图盒子的比例 (u,v)∈[0,1]，origin 左上。
 *   现有两套雪碧图(俯仰 pitch / 侧倾 lean)，每套帧里猫姿势不同 → 各一张锚点表，按当前 postureAxis 选用。
 *   关键帧数值由 DeskScreen 的校准模式（CALIBRATE=true，点击猫身打印 axis+帧号+u,v）实测后填入。
 *
 * 校准步骤：
 *   1) 把 DeskScreen 的 CALIBRATE 设为 true。
 *   2) 纯做「前后(低头/平视)」→ 走 pitch 轴；纯做「左右倾」→ 走 lean 轴。
 *   3) 在几个角度停住，依次点 头(c7)/中背(t12)/腰(l5)，读控制台 `[catAnchors:axis] frame=.. u=.. v=..`。
 *   4) 把读到的 frame + 三点 u,v 覆盖到对应表的关键帧（越多越贴）。
 *
 * [WHO] 导出 `Anchor`、`SpineAnchors`、`PostureAxis`、`anchorsAt(axis, frameIndex)`
 * [FROM] 无依赖（纯数据 + 插值）
 * [TO] 被 DeskScreen 的 SensorOverlay 消费，换算成像素点位
 * [HERE] src/ui/assets/catAnchors.ts · 点位逐帧标定表（双轴）
 */

export type Anchor = {u: number; v: number};
export type SpineAnchors = {c7: Anchor; t12: Anchor; l5: Anchor};
export type PostureAxis = 'pitch' | 'lean';

/** 侧倾(lean)帧锚点：左↔右翻页。已粗标，可继续校准加密。 */
const LEAN_KEYFRAMES: Array<{frame: number; spine: SpineAnchors}> = [
  // 帧 1：头低俯、偏左
  {frame: 0, spine: {c7: {u: 0.30, v: 0.34}, t12: {u: 0.40, v: 0.44}, l5: {u: 0.50, v: 0.60}}},
  // 帧 30：身体直起、头朝上
  {frame: 29, spine: {c7: {u: 0.58, v: 0.20}, t12: {u: 0.46, v: 0.42}, l5: {u: 0.46, v: 0.62}}},
  // 帧 60：头朝右
  {frame: 59, spine: {c7: {u: 0.66, v: 0.30}, t12: {u: 0.50, v: 0.46}, l5: {u: 0.46, v: 0.60}}},
];

/** 俯仰(pitch)帧锚点：平视↔低头翻页。⚠️ 下方为粗略初值，请用 CALIBRATE 模式实测覆盖。 */
const PITCH_KEYFRAMES: Array<{frame: number; spine: SpineAnchors}> = [
  // 帧 1：平视端（身体较直、头朝上）
  {frame: 0, spine: {c7: {u: 0.5, v: 0.2}, t12: {u: 0.5, v: 0.45}, l5: {u: 0.5, v: 0.65}}},
  // 帧 30：中间
  {frame: 29, spine: {c7: {u: 0.48, v: 0.3}, t12: {u: 0.5, v: 0.47}, l5: {u: 0.5, v: 0.65}}},
  // 帧 60：低头端（头下俯、上背前倾）
  {frame: 59, spine: {c7: {u: 0.46, v: 0.42}, t12: {u: 0.5, v: 0.52}, l5: {u: 0.5, v: 0.66}}},
];

const KEYFRAMES: Record<PostureAxis, Array<{frame: number; spine: SpineAnchors}>> = {
  pitch: PITCH_KEYFRAMES,
  lean: LEAN_KEYFRAMES,
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAnchor(a: Anchor, b: Anchor, t: number): Anchor {
  return {u: lerp(a.u, b.u, t), v: lerp(a.v, b.v, t)};
}

function lerpSpine(a: SpineAnchors, b: SpineAnchors, t: number): SpineAnchors {
  return {
    c7: lerpAnchor(a.c7, b.c7, t),
    t12: lerpAnchor(a.t12, b.t12, t),
    l5: lerpAnchor(a.l5, b.l5, t),
  };
}

const FALLBACK: SpineAnchors = {c7: {u: 0.5, v: 0.22}, t12: {u: 0.5, v: 0.45}, l5: {u: 0.5, v: 0.65}};

/** 取某轴第 frameIndex 帧的脊柱锚点：关键帧之间线性插值，越界取端点。 */
export function anchorsAt(axis: PostureAxis, frameIndex: number): SpineAnchors {
  const keys = KEYFRAMES[axis] ?? [];
  if (keys.length === 0) {
    return FALLBACK;
  }
  if (frameIndex <= keys[0].frame) {
    return keys[0].spine;
  }
  const last = keys[keys.length - 1];
  if (frameIndex >= last.frame) {
    return last.spine;
  }
  for (let i = 0; i < keys.length - 1; i += 1) {
    const lo = keys[i];
    const hi = keys[i + 1];
    if (frameIndex >= lo.frame && frameIndex <= hi.frame) {
      const span = hi.frame - lo.frame || 1;
      const t = (frameIndex - lo.frame) / span;
      return lerpSpine(lo.spine, hi.spine, t);
    }
  }
  return last.spine;
}
