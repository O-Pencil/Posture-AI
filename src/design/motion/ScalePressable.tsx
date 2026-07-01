/**
 * @file ScalePressable.tsx
 * @description 触控缩放反馈：Android/RN 端用 Reanimated 跑在 UI 线程，适合按钮、chip、卡片入口。
 *
 * [WHO] 导出 `ScalePressable`
 * [FROM] 依赖 `react`、`react-native`、`react-native-reanimated`
 * [TO] 被 src/design primitives/components 复用按压反馈
 * [HERE] src/design/motion/ScalePressable.tsx · 按压动效容器
 */
import React from 'react';
import {GestureResponderEvent, Pressable, PressableProps, StyleProp, ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

type Props = Omit<PressableProps, 'children'> & {
  children: React.ReactNode;
  pressedScale?: number;
  duration?: number;
  contentStyle?: StyleProp<ViewStyle>;
};

export function ScalePressable({
  pressedScale = 0.97,
  duration = 110,
  contentStyle,
  children,
  disabled,
  onPressIn,
  onPressOut,
  ...pressableProps
}: Props): React.JSX.Element {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disabled) {
      scale.value = withTiming(pressedScale, {duration});
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    scale.value = withTiming(1, {duration});
    onPressOut?.(event);
  };

  return (
    <Pressable {...pressableProps} disabled={disabled} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[contentStyle, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
