/**
 * @file CatFlipbook.tsx
 * @description 翻页画册：把"旋转视频"预切的有序帧序列，按传感器角度映射到帧下标并平滑播放，
 *   视觉等价视频但零解码、可双向实时跟手。丝滑靠两件事：帧够密 + 帧号用 Animated 缓动（不瞬移）。
 *
 * [WHO] 导出 `CatFlipbook`
 * [FROM] 依赖 `react`、`react-native`(Animated/Image)
 * [TO] 被 `DeskScreen` 用作主视觉（驱动角度来自 DashboardState）
 * [HERE] src/ui/components/CatFlipbook.tsx · 角度驱动的帧序列播放器
 */
import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  /** 有序帧（require 出来的图源数组）。 */
  frames: ImageSourcePropType[];
  /** 驱动角度（度）。 */
  angle: number;
  /** angle 下界 → 第 0 帧。 */
  minDeg?: number;
  /** angle 上界 → 最后一帧。 */
  maxDeg?: number;
  /** 视频拍摄方向与角度相反时翻转映射。 */
  invert?: boolean;
  /** 角度变化 → 帧号滑动的缓动时长（ms）。越大越"重"、越小越跟手。 */
  glideMs?: number;
  style?: StyleProp<ViewStyle>;
};

/** 角度 → [0,1] 归一化，再映射到帧下标（连续小数，交给 Animated 缓动）。 */
function angleToIndex(angle: number, count: number, minDeg: number, maxDeg: number, invert: boolean): number {
  if (count < 2 || maxDeg === minDeg) {
    return 0;
  }
  let t = (angle - minDeg) / (maxDeg - minDeg);
  t = Math.max(0, Math.min(1, t));
  if (invert) {
    t = 1 - t;
  }
  return t * (count - 1);
}

export function CatFlipbook({
  frames,
  angle,
  minDeg = -25,
  maxDeg = 25,
  invert = false,
  glideMs = 260,
  style,
}: Props): React.JSX.Element | null {
  const count = frames.length;
  const initial = angleToIndex(angle, count, minDeg, maxDeg, invert);
  const idx = useRef(new Animated.Value(initial)).current;
  const [display, setDisplay] = useState(Math.round(initial));

  // 角度变化 → 平滑滑到目标帧（中间帧一张张划过 = 连续转头，而非瞬移切图）
  useEffect(() => {
    const target = angleToIndex(angle, count, minDeg, maxDeg, invert);
    const anim = Animated.timing(idx, {
      toValue: target,
      duration: glideMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [angle, count, minDeg, maxDeg, invert, glideMs, idx]);

  // 把缓动中的小数帧号 → 取整后切图；仅在整数帧变化时 setState（避免每帧重渲染）
  useEffect(() => {
    const sub = idx.addListener(({value}) => {
      const rounded = Math.round(value);
      setDisplay(prev => (prev === rounded ? prev : rounded));
    });
    return () => idx.removeListener(sub);
  }, [idx]);

  if (count === 0) {
    return null;
  }
  const safe = Math.max(0, Math.min(count - 1, display));
  return (
    <View style={[styles.frame, style]} pointerEvents="none">
      <Image source={frames[safe]} style={styles.image} resizeMode="contain" fadeDuration={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
