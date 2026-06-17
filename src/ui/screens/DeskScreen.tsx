/**
 * @file DeskScreen.tsx
 * @description Desk 首页：Header + 模型反馈 + 三指标 + 主视觉（猫翻页帧序列，回退 portal.png）+ 传感器点位曲线。三端共用。
 *
 * 主视觉「角度驱动翻页」：左右倾(lumbar)映射到 LEAN_FRAMES 帧下标，由 CatFlipbook 平滑播放（等价视频、零解码）。
 * 接入帧（单轴样例，用现有 left2right.mp4）：
 *   1) 切帧：ffmpeg -i public/mp4/left2right.mp4 -vsync 0 public/frames/lean/lean_%04d.png
 *   2) （可选）重命名为 lean_stage_%04d.png 后生成清单：node scripts/gen-frame-manifest.mjs lean
 *      脚本会同步写 leanFrames.ts，并为 lean_*.png 创建指向 lean_stage_*.png 的兼容软链。
 *   帧密度足够（≤1°/帧）+ CatFlipbook 帧号缓动 → 视觉与视频无异。无帧时自动回退 portal.png。
 *
 * [WHO] 导出 `DeskScreen`
 * [FROM] 依赖 `react`、`react-native`、`react-native-svg`、`../../posture/types`、`../theme`、`../components/CatFlipbook`、`../assets/leanFrames`、`../../../public/portal.png`
 * [TO] 被 `AppShell` 在 desk tab 渲染
 * [HERE] src/ui/screens/DeskScreen.tsx · Desk 首页布局原型的 RNW 迁移版
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Animated, Easing, Image, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';

import {DashboardState} from '../../posture/types';
import {theme} from '../theme';
import {CatFlipbook} from '../components/CatFlipbook';
import {LEAN_FRAMES} from '../assets/leanFrames';

const PORTAL_IMAGE = require('../../../public/portal.png');
/** 左右倾翻页的可视角度范围（lumbarRoll 度）→ 第 0..N-1 帧。按视频实拍幅度可调。 */
const LEAN_RANGE_DEG = 25;
const SCENE_ASPECT_RATIO = 2 / 3;
const SCENE_MAX_WIDTH = 360;
const SCENE_BOTTOM_GAP = 10;

const SENSOR_VIEWBOX = {width: 184, height: 190};
const SENSOR_CENTER_X = 92;
const SENSOR_PIXELS_PER_DEGREE = 1.5;
const SENSOR_MAX_OFFSET_DEG = 18;

type SensorAngles = {
  c7: number;
  t12: number;
  l5: number;
};

type SensorPoint = {
  key: keyof SensorAngles;
  x: number;
  y: number;
};

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatDeg(value: number): string {
  return `${Math.abs(value).toFixed(1)}°`;
}

function sensorPoints(angles: SensorAngles): SensorPoint[] {
  const base: Array<{key: keyof SensorAngles; y: number}> = [
    {key: 'c7', y: 54},
    {key: 't12', y: 104},
    {key: 'l5', y: 154},
  ];

  return base.map(point => {
    const angle = clamp(angles[point.key], -SENSOR_MAX_OFFSET_DEG, SENSOR_MAX_OFFSET_DEG);
    return {
      ...point,
      x: SENSOR_CENTER_X + angle * SENSOR_PIXELS_PER_DEGREE,
    };
  });
}

function curvePath(points: SensorPoint[]): string {
  const [c7, t12, l5] = points;
  const midC7T12 = (c7.y + t12.y) / 2;
  const midT12L5 = (t12.y + l5.y) / 2;
  return `M ${c7.x} ${c7.y} C ${c7.x} ${midC7T12}, ${t12.x} ${midC7T12}, ${t12.x} ${t12.y} S ${l5.x} ${midT12L5}, ${l5.x} ${l5.y}`;
}

function useAnimatedSensorAngles(target: SensorAngles): SensorAngles {
  const c7 = useRef(new Animated.Value(target.c7)).current;
  const t12 = useRef(new Animated.Value(target.t12)).current;
  const l5 = useRef(new Animated.Value(target.l5)).current;
  const [current, setCurrent] = useState(target);

  useEffect(() => {
    const c7Listener = c7.addListener(({value}) => {
      setCurrent(previous => ({...previous, c7: value}));
    });
    const t12Listener = t12.addListener(({value}) => {
      setCurrent(previous => ({...previous, t12: value}));
    });
    const l5Listener = l5.addListener(({value}) => {
      setCurrent(previous => ({...previous, l5: value}));
    });

    return () => {
      c7.removeListener(c7Listener);
      t12.removeListener(t12Listener);
      l5.removeListener(l5Listener);
    };
  }, [c7, t12, l5]);

  useEffect(() => {
    const config = {
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    };
    Animated.parallel([
      Animated.timing(c7, {...config, toValue: target.c7}),
      Animated.timing(t12, {...config, toValue: target.t12}),
      Animated.timing(l5, {...config, toValue: target.l5}),
    ]).start();
  }, [c7, l5, t12, target.c7, target.l5, target.t12]);

  return current;
}

function DeskHeader({state}: {state: DashboardState}): React.JSX.Element {
  const feedback =
    state.advice ||
    'Your sitting posture is very standard, please keep it up, you have been sitting still for 3h 28min already!';

  return (
    <View style={styles.header}>
      <Text style={styles.kicker}>CATUNE</Text>
      <Text style={styles.greeting}>
        {greeting()}, <Text style={styles.highlight}>Xiao Yu</Text>
      </Text>
      <Text style={styles.feedback} numberOfLines={3}>
        {state.streaming ? `${feedback} ▍` : feedback}
      </Text>
    </View>
  );
}

function MetricStrip({state}: {state: DashboardState}): React.JSX.Element {
  const metrics = [
    {label: 'C7 Neck', value: state.neckPitch},
    {label: 'T12 Thor.', value: state.thorPitch},
    {label: 'L5 Lumbar', value: state.lumbarRoll},
  ];

  return (
    <View style={styles.metrics}>
      {metrics.map(metric => (
        <View key={metric.label} style={styles.metricItem}>
          <Text style={styles.metricLabel} numberOfLines={1}>
            {metric.label}
          </Text>
          <Text style={styles.metricValue}>{formatDeg(metric.value)}</Text>
        </View>
      ))}
    </View>
  );
}

function SensorOverlay({state}: {state: DashboardState}): React.JSX.Element {
  const targetAngles = useMemo(
    () => ({
      c7: state.neckPitch,
      t12: state.thorPitch,
      l5: state.lumbarRoll,
    }),
    [state.lumbarRoll, state.neckPitch, state.thorPitch],
  );
  const animatedAngles = useAnimatedSensorAngles(targetAngles);
  const points = sensorPoints(animatedAngles);
  const path = curvePath(points);

  return (
    <View style={styles.sensorOverlay} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SENSOR_VIEWBOX.width} ${SENSOR_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid meet">
        <Path d={path} fill="none" stroke="#5F625D" strokeOpacity={0.48} strokeWidth={1.4} strokeLinecap="round" />
        {points.map(point => (
          <Circle
            key={point.key}
            cx={point.x}
            cy={point.y}
            r={7}
            fill="rgba(20,20,20,0.35)"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={1.2}
          />
        ))}
        {points.map(point => (
          <Circle key={`${point.key}-core`} cx={point.x} cy={point.y} r={2.3} fill="#FFFFFF" />
        ))}
      </Svg>
    </View>
  );
}

function PostureScene({state}: {state: DashboardState}): React.JSX.Element {
  const hasFrames = LEAN_FRAMES.length > 1;
  const [visualSize, setVisualSize] = useState<{width: number; height: number} | null>(null);
  const visualStyle = useMemo(() => [styles.sceneVisual, visualSize ?? undefined], [visualSize]);

  return (
    <View style={styles.scene}>
      <View
        style={styles.sceneFrame}
        onLayout={event => {
          const {width, height} = event.nativeEvent.layout;
          const availableHeight = Math.max(0, height - SCENE_BOTTOM_GAP);
          const nextWidth = Math.min(width * 0.92, SCENE_MAX_WIDTH, availableHeight * SCENE_ASPECT_RATIO);
          const nextHeight = nextWidth / SCENE_ASPECT_RATIO;

          setVisualSize(prev =>
            prev && Math.abs(prev.width - nextWidth) < 0.5 && Math.abs(prev.height - nextHeight) < 0.5
              ? prev
              : {width: nextWidth, height: nextHeight},
          );
        }}>
        {hasFrames ? (
          // 角度驱动翻页：左右倾 → 帧序列平滑播放（无帧时下面回退静态图）
          <CatFlipbook
            frames={LEAN_FRAMES}
            angle={state.lumbarRoll}
            minDeg={-LEAN_RANGE_DEG}
            maxDeg={LEAN_RANGE_DEG}
            style={visualStyle}
          />
        ) : (
          <Image source={PORTAL_IMAGE} style={visualStyle} resizeMode="contain" />
        )}
        <SensorOverlay state={state} />
      </View>
    </View>
  );
}

export function DeskScreen({state}: {state: DashboardState; subtitle?: string}): React.JSX.Element {
  return (
    <View style={styles.root}>
      <DeskHeader state={state} />
      <MetricStrip state={state} />
      <PostureScene state={state} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingBottom: 104,
  },
  header: {
    paddingHorizontal: 32,
    paddingTop: 8,
    paddingBottom: 8,
  },
  kicker: {
    color: theme.colors.textMuted,
    fontSize: 8,
    fontWeight: theme.font.weightBold,
    letterSpacing: 0.5,
  },
  greeting: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  highlight: {
    color: theme.colors.primary,
  },
  feedback: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: theme.font.weightBold,
    lineHeight: 17,
    marginTop: 6,
    maxWidth: 300,
  },
  metrics: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingBottom: 8,
    gap: 20,
  },
  metricItem: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 8,
    fontWeight: theme.font.weightBold,
  },
  metricValue: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: theme.font.weightBold,
    lineHeight: 18,
    marginTop: 3,
  },
  scene: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sceneFrame: {
    width: '100%',
    height: '100%',
    maxHeight: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sceneVisual: {
    marginBottom: SCENE_BOTTOM_GAP,
    overflow: 'hidden',
  },
  sensorOverlay: {
    position: 'absolute',
    left: '62%',
    top: '28%',
    width: 184,
    height: 190,
    marginLeft: -92,
  },
});
