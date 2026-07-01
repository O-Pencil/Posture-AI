/**
 * @file types.ts
 * @description Catune motion 类型：保留 Framer Motion 心智，但限定到 Android/RN 稳定的 opacity/translate/scale。
 *
 * [WHO] 导出 `MotionState`、`MotionTransition`
 * [FROM] 无运行时依赖
 * [TO] 被 src/design/motion 组件复用
 * [HERE] src/design/motion/types.ts · 动效参数契约
 */
export type MotionState = {
  opacity?: number;
  translateX?: number;
  translateY?: number;
  scale?: number;
};

export type MotionTransition = {
  type?: 'timing' | 'spring';
  duration?: number;
  damping?: number;
  stiffness?: number;
};
