/**
 * @file MotionView.tsx
 * @description Android 优先的 Reanimated View。API 借鉴 Framer Motion 的 initial / animate / transition。
 *
 * [WHO] 导出 `MotionView`
 * [FROM] 依赖 `react`、`react-native`、`react-native-reanimated`、`./types`
 * [TO] 被 src/design screens/components 承载状态切换、入场、轻量反馈动效
 * [HERE] src/design/motion/MotionView.tsx · 基础动效容器
 */
import React, {useEffect, useMemo} from 'react';
import {StyleProp, ViewProps, ViewStyle} from 'react-native';
import Animated, {SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming} from 'react-native-reanimated';
import {MotionState, MotionTransition} from './types';

type Props = ViewProps & {
  initial?: MotionState;
  animate?: MotionState;
  transition?: MotionTransition;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_STATE: Required<MotionState> = {
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scale: 1,
};

function valueOf(state: MotionState | undefined, key: keyof MotionState): number {
  return state?.[key] ?? DEFAULT_STATE[key];
}

function animateValue(value: SharedValue<number>, toValue: number, transition: MotionTransition | undefined): void {
  if (transition?.type === 'spring') {
    value.value = withSpring(toValue, {
      damping: transition.damping ?? 18,
      stiffness: transition.stiffness ?? 180,
    });
    return;
  }

  value.value = withTiming(toValue, {duration: transition?.duration ?? 180});
}

export function MotionView({initial, animate, transition, style, children, ...viewProps}: Props): React.JSX.Element {
  const start = useMemo(() => initial ?? animate ?? DEFAULT_STATE, [animate, initial]);
  const opacity = useSharedValue(valueOf(start, 'opacity'));
  const translateX = useSharedValue(valueOf(start, 'translateX'));
  const translateY = useSharedValue(valueOf(start, 'translateY'));
  const scale = useSharedValue(valueOf(start, 'scale'));

  useEffect(() => {
    const target = animate ?? DEFAULT_STATE;
    animateValue(opacity, valueOf(target, 'opacity'), transition);
    animateValue(translateX, valueOf(target, 'translateX'), transition);
    animateValue(translateY, valueOf(target, 'translateY'), transition);
    animateValue(scale, valueOf(target, 'scale'), transition);
  }, [animate, opacity, scale, transition, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {translateX: translateX.value},
      {translateY: translateY.value},
      {scale: scale.value},
    ],
  }));

  return (
    <Animated.View {...viewProps} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
