/**
 * @file CatSprite.tsx
 * @description 雪碧图（sprite sheet）播放器：把所有帧拼成一张图集只解码一次，按角度用「裁剪+平移」露出对应格子。
 *   平移走 Animated + useNativeDriver（UI 线程），不换 source、不重解码、不每帧 setState → 解决逐帧换图的卡顿。
 *   丝滑等价视频且不糊（图集按需打包，平面猫几乎无细节损失）。当前帧号经 onFrameChange 给点位层（低频，仅整数变化）。
 *
 * 为什么不再用单张 Image 逐帧换：每帧换 source = 重新解码大图 + React 重渲染，正是“一卡一卡”的根因。
 *
 * [WHO] 导出 `CatSprite`
 * [FROM] 依赖 `react`、`react-native`(Animated.Image)
 * [TO] 被 `DeskScreen` 用作主视觉（有图集时优先于 CatFlipbook）
 * [HERE] src/ui/components/CatSprite.tsx · 雪碧图角度播放器
 */
import React, {useEffect, useMemo, useRef} from 'react';
import {
  Animated,
  Easing,
  ImageSourcePropType,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  /** 图集大图（require）。 */
  atlas: ImageSourcePropType;
  /** 图集列数（行优先排布）。 */
  cols: number;
  /** 图集行数。 */
  rows: number;
  /** 有效帧数（图集可能有空尾格）。 */
  count: number;
  /** 驱动角度（度）。 */
  angle: number;
  /** 单格显示尺寸（= 猫盒子尺寸）。 */
  cellWidth: number;
  cellHeight: number;
  minDeg?: number;
  maxDeg?: number;
  invert?: boolean;
  /** 角度变化 → 帧号滑动缓动时长。 */
  glideMs?: number;
  /** 当前整数帧变化时回调（供点位层）。 */
  onFrameChange?: (frameIndex: number) => void;
  style?: StyleProp<ViewStyle>;
};

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

export function CatSprite({
  atlas,
  cols,
  rows,
  count,
  angle,
  cellWidth,
  cellHeight,
  minDeg = -25,
  maxDeg = 25,
  invert = false,
  glideMs = 220,
  onFrameChange,
  style,
}: Props): React.JSX.Element | null {
  const initial = angleToIndex(angle, count, minDeg, maxDeg, invert);
  const frameAnim = useRef(new Animated.Value(initial)).current;

  const onFrameChangeRef = useRef(onFrameChange);
  onFrameChangeRef.current = onFrameChange;

  const w = Math.max(1, Math.round(cellWidth));
  const h = Math.max(1, Math.round(cellHeight));
  const displayW = cols * w;
  const displayH = rows * h;

  // 角度 → 目标帧，UI 线程缓动平移（不触发 React 重渲染图集）
  useEffect(() => {
    const target = angleToIndex(angle, count, minDeg, maxDeg, invert);
    const anim = Animated.timing(frameAnim, {
      toValue: target,
      duration: glideMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [angle, count, minDeg, maxDeg, invert, glideMs, frameAnim]);

  // 帧号 → 通知点位层（仅整数变化）
  useEffect(() => {
    let last = -1;
    const sub = frameAnim.addListener(({value}) => {
      const rounded = Math.max(0, Math.min(count - 1, Math.round(value)));
      if (rounded !== last) {
        last = rounded;
        onFrameChangeRef.current?.(rounded);
      }
    });
    return () => frameAnim.removeListener(sub);
  }, [frameAnim, count]);

  // 阶梯式（snap）插值：每帧在 [i-0.5, i+0.5) 内保持整格位置，半整数处近乎瞬跳到下一格。
  // 雪碧图必须整格对齐——线性平移会让两格同时露出=横向拖影，不是旋转。行优先：col=i%cols, row=floor(i/cols)。
  const {inputRange, xOut, yOut} = useMemo(() => {
    // 平移用显示坐标（每格 w×h），与 Image 拉伸到 cols*w × rows*h 一致，避免 resolve 尺寸抖动错格
    const X = (i: number) => -((i % cols) * w);
    const Y = (i: number) => -(Math.floor(i / cols) * h);
    const input: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < count; i += 1) {
      input.push(i);
      xs.push(X(i));
      ys.push(Y(i));
      if (i < count - 1) {
        input.push(i + 0.4999);
        xs.push(X(i));
        ys.push(Y(i));
        input.push(i + 0.5);
        xs.push(X(i + 1));
        ys.push(Y(i + 1));
      }
    }
    if (count < 2) {
      input.push(1);
      xs.push(xs[0] ?? 0);
      ys.push(ys[0] ?? 0);
    }
    return {inputRange: input, xOut: xs, yOut: ys};
  }, [count, cols, rows, w, h]);

  if (w <= 0 || h <= 0 || count < 1) {
    return null;
  }

  const translateX = frameAnim.interpolate({inputRange, outputRange: xOut, extrapolate: 'clamp'});
  const translateY = frameAnim.interpolate({inputRange, outputRange: yOut, extrapolate: 'clamp'});

  return (
    // clip 由父级 absoluteFill 给出尺寸（= 一个单元格 = 猫盒子）；overflow 隐藏裁出当前格
    <View style={[styles.clip, style]} pointerEvents="none">
      <Animated.Image
        source={atlas}
        fadeDuration={0}
        resizeMode="stretch"
        {...(Platform.OS === 'android' ? {resizeMethod: 'resize' as const} : {})}
        style={{
          width: displayW,
          height: displayH,
          transform: [{translateX}, {translateY}],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});
