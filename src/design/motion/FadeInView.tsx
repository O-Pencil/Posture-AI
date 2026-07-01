/**
 * @file FadeInView.tsx
 * @description 常用入场动效：淡入 + 轻微上移，适合页面区块和状态面板。
 *
 * [WHO] 导出 `FadeInView`
 * [FROM] 依赖 `react`、`react-native`、`./MotionView`
 * [TO] 被 src/design screens/components 做轻量入场动画
 * [HERE] src/design/motion/FadeInView.tsx · 入场动效
 */
import React from 'react';
import {StyleProp, ViewProps, ViewStyle} from 'react-native';
import {MotionView} from './MotionView';

type Props = ViewProps & {
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

export function FadeInView({distance = 8, duration = 220, style, children, ...viewProps}: Props): React.JSX.Element {
  return (
    <MotionView
      {...viewProps}
      initial={{opacity: 0, translateY: distance}}
      animate={{opacity: 1, translateY: 0}}
      transition={{duration}}
      style={style}>
      {children}
    </MotionView>
  );
}
