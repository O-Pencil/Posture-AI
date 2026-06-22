/**
 * @file PlantProgressArc.tsx
 * @description 植物页半圆进度弧：浅灰轨道 + 青柠绿进度（上半圆弧 Path，无需裁切）。
 */
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';

/** 与 plant.png 叶片高光一致的配色 */
export const PLANT_ARC_COLORS = {
  track: '#E0E0E0',
  progress: '#A2D149',
} as const;

type Props = {
  /** 0–1，映射到可见半圆弧长 */
  progress: number;
  /** 弧所在正方形容器边长 */
  size: number;
};

export function PlantProgressArc({progress, size}: Props): React.JSX.Element {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const arcLen = Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  const filled = arcLen * clamped;
  const height = size / 2 + stroke;

  const d = useMemo(() => `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`, [cx, cy, r]);

  return (
    <View style={[styles.wrap, {width: size, height}]} collapsable={false}>
      <Svg width={size} height={height}>
        <Path d={d} stroke={PLANT_ARC_COLORS.track} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        {filled > 0 && (
          <Path
            d={d}
            stroke={PLANT_ARC_COLORS.progress}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${arcLen}`}
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', justifyContent: 'flex-end'},
});
