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
import React, {useMemo, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';

import {DashboardState, PostureAction, PostureName, SpineNode} from '../../posture/types';
import {ACTION_META} from '../../posture/actionTag';
import {exerciseFor} from '../../posture/exercises';
import {MemoryService} from '../../posture/memory/service';

const FEEDBACK_LABEL: Record<PostureName, string> = {
  TECH_NECK: '头前倾',
  SLUMPED: '驼背',
  LEFT_LEAN: '侧倾',
  NORMAL: '正常',
  OFFLINE: '离线',
};
import {theme} from '../theme';
import {CatFlipbook} from '../components/CatFlipbook';
import {CatSprite} from '../components/CatSprite';
import {LEAN_FRAMES} from '../assets/leanFrames';
import {LEAN_ATLAS} from '../assets/leanAtlas';
import {anchorsAt} from '../assets/catAnchors';

const PORTAL_IMAGE = require('../../../public/portal.png');
/** 左右倾翻页的可视角度范围（lumbarRoll 度）→ 第 0..N-1 帧。按视频实拍幅度可调。 */
const LEAN_RANGE_DEG = 25;
/** 点位校准模式：开启后点击猫身打印该点的 (u,v) + 当前帧号，用于填 catAnchors 的关键帧表。 */
const CALIBRATE = false;
const SCENE_ASPECT_RATIO = 2 / 3;
const SCENE_MAX_WIDTH = 360;
const SCENE_BOTTOM_GAP = 10;

type Pixel = {x: number; y: number};

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function formatDeg(value: number): string {
  return `${Math.abs(value).toFixed(1)}°`;
}

/** 经过 C7→T12→L5 三点的平滑脊柱曲线（像素坐标）。 */
function spineCurvePath(c7: Pixel, t12: Pixel, l5: Pixel): string {
  const midUpper = (c7.y + t12.y) / 2;
  const midLower = (t12.y + l5.y) / 2;
  return `M ${c7.x} ${c7.y} C ${c7.x} ${midUpper}, ${t12.x} ${midUpper}, ${t12.x} ${t12.y} S ${l5.x} ${midLower}, ${l5.x} ${l5.y}`;
}

function DeskHeader({
  state,
  onOpenTraining,
  showFeedback,
  justRated,
  onFeedback,
}: {
  state: DashboardState;
  onOpenTraining?: (action: PostureAction) => void;
  showFeedback?: boolean;
  justRated?: boolean;
  onFeedback?: (good: boolean) => void;
}): React.JSX.Element {
  const feedback =
    state.advice ||
    'Your sitting posture is very standard, please keep it up, you have been sitting still for 3h 28min already!';
  // 仅当动作有配套例程时才把 chip 做成可点（HOLD/保持 无例程，不展示）
  const trainable = state.action != null && state.action !== 'HOLD' && exerciseFor(state.action) != null;

  return (
    <View style={styles.header}>
      <Text style={styles.kicker}>CATUNE</Text>
      <Text style={styles.greeting}>
        {greeting()}, <Text style={styles.highlight}>Xiao Yu</Text>
      </Text>
      <Text style={styles.feedback} numberOfLines={3}>
        {state.streaming ? `${feedback} ▍` : feedback}
      </Text>
      {trainable && state.action ? (
        <Pressable style={styles.actionChip} onPress={() => onOpenTraining?.(state.action as PostureAction)}>
          <View style={styles.actionDot} />
          <Text style={styles.actionChipText}>去跟练 · {ACTION_META[state.action].label}</Text>
          <Text style={styles.actionChevron}>›</Text>
        </Pressable>
      ) : null}
      {showFeedback ? (
        <View style={styles.feedbackRow}>
          <Text style={styles.feedbackQ}>这条提醒怎么样？</Text>
          <Pressable hitSlop={8} style={styles.fbBtn} onPress={() => onFeedback?.(true)}>
            <Text style={styles.fbEmoji}>👍</Text>
          </Pressable>
          <Pressable hitSlop={8} style={styles.fbBtn} onPress={() => onFeedback?.(false)}>
            <Text style={styles.fbEmoji}>👎</Text>
          </Pressable>
        </View>
      ) : justRated ? (
        <Text style={styles.feedbackThanks}>已记住 ✓</Text>
      ) : null}
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

/** 点位层：按「当前帧」的脊柱锚点（比例）× 猫盒子尺寸换算成像素，贴在猫的头→腰上。
 *  highlightNode：当前建议动作对应的节点 → 该点位橙色高亮 + 光环，把"模型说的动作"指到猫身上。 */
function SensorOverlay({
  frameIndex,
  boxW,
  boxH,
  highlightNode,
}: {
  frameIndex: number;
  boxW: number;
  boxH: number;
  highlightNode: SpineNode | null;
}): React.JSX.Element | null {
  if (boxW <= 0 || boxH <= 0) {
    return null;
  }
  const spine = anchorsAt(frameIndex);
  const points: Array<{key: SpineNode; x: number; y: number}> = [
    {key: 'c7', x: spine.c7.u * boxW, y: spine.c7.v * boxH},
    {key: 't12', x: spine.t12.u * boxW, y: spine.t12.v * boxH},
    {key: 'l5', x: spine.l5.u * boxW, y: spine.l5.v * boxH},
  ];
  const [c7, t12, l5] = points;
  const path = spineCurvePath(c7, t12, l5);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={boxW} height={boxH} viewBox={`0 0 ${boxW} ${boxH}`}>
        <Path d={path} fill="none" stroke="#5F625D" strokeOpacity={0.48} strokeWidth={1.4} strokeLinecap="round" />
        {points.map(point => {
          const hot = point.key === highlightNode;
          return (
            <React.Fragment key={point.key}>
              {hot ? <Circle cx={point.x} cy={point.y} r={13} fill="rgba(251,75,0,0.18)" /> : null}
              <Circle
                cx={point.x}
                cy={point.y}
                r={hot ? 9 : 7}
                fill={hot ? 'rgba(251,75,0,0.30)' : 'rgba(20,20,20,0.35)'}
                stroke={hot ? '#FB4B00' : 'rgba(255,255,255,0.9)'}
                strokeWidth={hot ? 2 : 1.2}
              />
              <Circle cx={point.x} cy={point.y} r={2.3} fill={hot ? '#FFE6D8' : '#FFFFFF'} />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

type RenderMode = 'sprite' | 'frames';

function PostureScene({state}: {state: DashboardState}): React.JSX.Element {
  const hasAtlas = LEAN_ATLAS.source != null && LEAN_ATLAS.count > 1;
  const hasFrames = LEAN_FRAMES.length > 1;
  const [visualSize, setVisualSize] = useState<{width: number; height: number} | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  // 渲染方式：默认雪碧图；两者都就绪时可切到旧的逐帧关键帧渲染做对比
  const [renderMode, setRenderMode] = useState<RenderMode>('sprite');
  const useSprite = renderMode === 'sprite' && hasAtlas;
  const showModeToggle = hasAtlas && hasFrames;
  // 建议动作 → 高亮对应脊柱节点（把"模型说的动作"指到猫身上）
  const highlightNode: SpineNode | null = state.action ? ACTION_META[state.action].node : null;
  const boxStyle = useMemo(() => [styles.sceneVisual, visualSize ?? undefined], [visualSize]);
  const boxW = visualSize?.width ?? 0;
  const boxH = visualSize?.height ?? 0;

  // 校准：点击猫身 → 打印该点比例 (u,v) + 当前帧号，照着填 catAnchors 的关键帧表
  const onCalibrateTap = (evt: {nativeEvent: {locationX: number; locationY: number}}) => {
    if (boxW <= 0 || boxH <= 0) {
      return;
    }
    const u = (evt.nativeEvent.locationX / boxW).toFixed(3);
    const v = (evt.nativeEvent.locationY / boxH).toFixed(3);
    // eslint-disable-next-line no-console
    console.log(`[catAnchors] frame=${frameIndex}  u=${u}  v=${v}`);
  };

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
        {/* 猫盒子：主视觉 + 点位层共用同一矩形，点位用比例坐标自动贴合 */}
        <View style={boxStyle}>
          {useSprite && LEAN_ATLAS.source ? (
            // 雪碧图：UI 线程平移，无逐帧解码/重渲染（首选，最顺）
            <CatSprite
              atlas={LEAN_ATLAS.source}
              cols={LEAN_ATLAS.cols}
              rows={LEAN_ATLAS.rows}
              count={LEAN_ATLAS.count}
              angle={state.lumbarRoll}
              cellWidth={boxW}
              cellHeight={boxH}
              minDeg={-LEAN_RANGE_DEG}
              maxDeg={LEAN_RANGE_DEG}
              onFrameChange={setFrameIndex}
              style={StyleSheet.absoluteFill}
            />
          ) : hasFrames ? (
            // 旧方案：逐帧关键帧（保留用于对比）
            <CatFlipbook
              frames={LEAN_FRAMES}
              angle={state.lumbarRoll}
              minDeg={-LEAN_RANGE_DEG}
              maxDeg={LEAN_RANGE_DEG}
              onFrameChange={setFrameIndex}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <Image source={PORTAL_IMAGE} style={StyleSheet.absoluteFill} resizeMode="contain" />
          )}
          <SensorOverlay frameIndex={frameIndex} boxW={boxW} boxH={boxH} highlightNode={highlightNode} />
          {CALIBRATE ? (
            <Pressable style={StyleSheet.absoluteFill} onPress={onCalibrateTap}>
              <Text style={styles.calibrateBadge}>CAL · frame {frameIndex}</Text>
            </Pressable>
          ) : null}
        </View>

        {showModeToggle ? (
          <View style={styles.modeToggle}>
            <Pressable
              style={[styles.modeSeg, renderMode === 'sprite' && styles.modeSegActive]}
              onPress={() => setRenderMode('sprite')}>
              <Text style={[styles.modeSegText, renderMode === 'sprite' && styles.modeSegTextActive]}>雪碧图</Text>
            </Pressable>
            <Pressable
              style={[styles.modeSeg, renderMode === 'frames' && styles.modeSegActive]}
              onPress={() => setRenderMode('frames')}>
              <Text style={[styles.modeSegText, renderMode === 'frames' && styles.modeSegTextActive]}>关键帧</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function DeskScreen({
  state,
  onOpenTraining,
  memory,
}: {
  state: DashboardState;
  subtitle?: string;
  onOpenTraining?: (action: PostureAction) => void;
  memory?: MemoryService;
}): React.JSX.Element {
  const [ratedAdvice, setRatedAdvice] = useState<string | null>(null);
  const abnormal = state.posture === 'SLUMPED' || state.posture === 'TECH_NECK' || state.posture === 'LEFT_LEAN';
  const showFeedback = !!memory && !!state.advice && abnormal && !state.streaming && state.advice !== ratedAdvice;
  const justRated = !!state.advice && abnormal && state.advice === ratedAdvice;

  const onFeedback = (good: boolean) => {
    if (!memory) {
      return;
    }
    if (good) {
      memory.remember({
        type: 'lesson',
        text: `${FEEDBACK_LABEL[state.posture]}时的提醒对他有效`,
        tags: [state.posture],
        importance: 0.6,
        source: 'feedback',
      });
    } else {
      memory.remember({
        type: 'preference',
        text: '上一条提醒不太对味，换种说法',
        tags: ['tone'],
        importance: 0.45,
        source: 'feedback',
      });
    }
    setRatedAdvice(state.advice);
  };

  return (
    <View style={styles.root}>
      <DeskHeader
        state={state}
        onOpenTraining={onOpenTraining}
        showFeedback={showFeedback}
        justRated={justRated}
        onFeedback={onFeedback}
      />
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
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: '#FCEAE0',
    borderWidth: 1,
    borderColor: 'rgba(251,75,0,0.35)',
  },
  actionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginRight: 6,
  },
  actionChipText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: theme.font.weightBold,
  },
  actionChevron: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: theme.font.weightBold,
    marginLeft: 4,
    marginTop: -1,
  },
  feedbackRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8},
  feedbackQ: {color: theme.colors.textMuted, fontSize: 11},
  fbBtn: {paddingHorizontal: 2},
  fbEmoji: {fontSize: 16},
  feedbackThanks: {color: '#3A9E1F', fontSize: 11, fontWeight: theme.font.weightBold, marginTop: 8},
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
    position: 'relative',
  },
  modeToggle: {
    position: 'absolute',
    top: 4,
    right: 8,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 2,
  },
  modeSeg: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  modeSegActive: {
    backgroundColor: '#FCEAE0',
  },
  modeSegText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: theme.font.weightBold,
  },
  modeSegTextActive: {
    color: theme.colors.primary,
  },
  calibrateBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    color: '#FB4B00',
    fontSize: 11,
    fontWeight: theme.font.weightBold,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
