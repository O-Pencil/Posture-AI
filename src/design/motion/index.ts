/**
 * @file index.ts
 * @description motion 桶文件：Android/RN 主线动效统一入口。
 *
 * [WHO] 导出 MotionView / FadeInView / ScalePressable / motion 类型
 * [FROM] 依赖同目录 motion 组件
 * [TO] 被 src/design screens/components/primitives 作为动效入口
 * [HERE] src/design/motion/index.ts · motion 统一导出
 */
export {MotionView} from './MotionView';
export {FadeInView} from './FadeInView';
export {ScalePressable} from './ScalePressable';
export type {MotionState, MotionTransition} from './types';
