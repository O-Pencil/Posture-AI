/**
 * @file DeskScreen.tsx
 * @description Desk 首页：Header + 模型反馈 + 三指标 + 主视觉（猫翻页帧序列，回退 portal.png）+ 传感器点位曲线。三端共用。
 *
 * 主视觉「角度驱动翻页」：俯仰(neck)映射到 PITCH_ATLAS / PITCH_FRAMES（cat-top-bottom.mp4 3–5s）；
 *   无 pitch 资源时回退左右倾(lean)。由 CatSprite 雪碧图 UI 线程平移（首选）或 CatFlipbook 逐帧。
 * 接入 pitch 帧（与 lean 同规格 540×810 RGBA 透明底）：
 *   node scripts/extract-pitch-frames.mjs --pack
 *
 * [WHO] 导出 `DeskScreen`
 * [FROM] 依赖 `react`、`react-native`、`react-native-svg`、`../../posture/types`、`../theme`、`../components/CatFlipbook`、`../assets/leanFrames`、`../../../public/portal.png`、`../i18n`
 * [TO] 被 `AppShell` 在 desk tab 渲染
 * [HERE] src/design/screens/DeskScreen.tsx · Desk 首页布局原型的 RNW 迁移版
 */
import React, {useEffect, useRef, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';

import {DashboardState, PostureAction, PostureName, SpineNode} from '../../posture/types';
import {getActionMeta} from '../../posture/actionTag';
import {getExercise} from '../../posture/exercises';
import {MemoryService} from '../../platform/memory/service';
import {useLocale, useT} from '../i18n';
import {extractUserName} from './userName';
import {theme} from '../theme';
import {CatFlipbook} from '../components/CatFlipbook';
import {CatSprite} from '../components/CatSprite';
import {LEAN_FRAMES} from '../assets/leanFrames';
import {LEAN_ATLAS} from '../assets/leanAtlas';
import {fitAtlasDisplaySize} from '../utils/atlasDisplaySize';
import {PITCH_FRAMES} from '../assets/pitchFrames';
import {PITCH_ATLAS} from '../assets/pitchAtlas';
import {anchorsAt, PostureAxis} from '../assets/catAnchors';
import {APP_NAME} from '../../constants/appMeta';
import {HeartIcon} from '../icons';

const PORTAL_IMAGE = require('../../../public/portal.png');
const DESK_IMAGE = require('../../../public/desk.png');
/** 俯仰翻页可视角度范围（相对 normalNeckRestDeg 的偏移，度）。 */
const PITCH_RANGE_DEG = 25;
/** 左右倾回退轴的可视角度范围（lumbarRoll 度）。 */
const LEAN_RANGE_DEG = 25;
/** 点位校准模式：开启后点击猫身打印该点的 (u,v) + 当前帧号，用于填 catAnchors 的关键帧表。 */
const CALIBRATE = false;
/** 允许相对图集单格 1:1 像素略放大（主视觉 hero） */
const ATLAS_DISPLAY_UPSCALE = 2.3;
/** 场景内布局：桌 top 锚点 + 猫相对桌 + 植物 scene 左上角 */
const DESK_TOP_RATIO = 0.1;
const DESK_TO_CAT_WIDTH = 1.68;
const DESK_ASPECT = 0.92;
/** 猫「脚」落在桌面上的位置（相对 desk 高度，自 desk 顶向下） */
const CAT_FEET_ON_DESK_RATIO = 0.1;
const PLANT_WIDTH_RATIO = 0.1;
const PLANT_ASPECT = 1;
/** 脊柱点位 SVG 相对猫 box 右移（与雪碧图脊柱中线对齐） */
const SENSOR_OVERLAY_X_SHIFT = 0.16;
/** 桌面宽度不超过 scene 的比例，防止随猫放大溢出 */
const DESK_MAX_SCENE_WIDTH = 0.96;
/** 猫在 scene 内占宽/占高上限 */
const CAT_WIDTH_RATIO = 1;
const CAT_HEIGHT_RATIO = 0.88;
/** 姿态轴切换迟滞（度），避免颈/腰阈值附近来回抖 */
const AXIS_HYSTERESIS_DEG = 4;
const SCENE_ASPECT_RATIO = 2 / 3;
const SCENE_BOTTOM_GAP = 16;
/** 模型反馈区固定 3 行高度，避免文案行数变化挤动下方场景 */
const FEEDBACK_LINE_HEIGHT = 20;
const FEEDBACK_MAX_LINES = 3;
const FEEDBACK_BLOCK_MIN_HEIGHT = FEEDBACK_LINE_HEIGHT * FEEDBACK_MAX_LINES;
/** Desk 主场景区距底部的 Tab 留白（与 root.paddingBottom 一致） */
const DESK_TAB_INSET = 104;

type Pixel = {x: number; y: number};

function greetingKey(): 'desk.greeting.morning' | 'desk.greeting.afternoon' | 'desk.greeting.evening' {
  const h = new Date().getHours();
  return h < 12 ? 'desk.greeting.morning' : h < 18 ? 'desk.greeting.afternoon' : 'desk.greeting.evening';
}

function formatDeg(value: number): string {
  return `${Math.abs(value).toFixed(1)}°`;
}

/** 俯仰 / 侧倾双轴：取偏离中立更大的那一轴驱动猫雪碧图；带迟滞避免阈值附近抖。 */
function useStablePostureAxis(
  state: DashboardState,
  hasPitch: boolean,
  hasLean: boolean,
): 'pitch' | 'lean' {
  const axisRef = useRef<'pitch' | 'lean'>('pitch');

  if (hasPitch && !hasLean) {
    axisRef.current = 'pitch';
    return 'pitch';
  }
  if (!hasPitch && hasLean) {
    axisRef.current = 'lean';
    return 'lean';
  }
  if (!hasPitch && !hasLean) {
    return 'pitch';
  }

  // 用「干净」的独立轴判别：俯仰=前倾量 thorPitch、侧倾=lumbarRoll。
  // 不用 neckPitch——它已与 lumbar 耦合(生理模拟)，会让左右侧倾误触发俯仰轴（抬头低头被左右干扰）。
  const pitchDev = Math.abs(state.thorPitch);
  const leanDev = Math.abs(state.lumbarRoll);
  const current = axisRef.current;

  if (current === 'pitch') {
    if (leanDev > pitchDev + AXIS_HYSTERESIS_DEG) {
      axisRef.current = 'lean';
    }
  } else if (pitchDev > leanDev + AXIS_HYSTERESIS_DEG) {
    axisRef.current = 'pitch';
  }

  return axisRef.current;
}

type SceneLayoutMetrics = {
  deskW: number;
  deskH: number;
  plantW: number;
  plantH: number;
  catTop: number;
  catLeft: number;
  boxW: number;
  boxH: number;
};

/** 桌 top 20% 锚点；猫相对桌；植物 scene 左上角 10% 宽。 */
function computeSceneLayout(
  sceneW: number,
  sceneH: number,
  visualSize: {width: number; height: number} | null,
): SceneLayoutMetrics {
  const empty = {
    deskW: 0,
    deskH: 0,
    plantW: 0,
    plantH: 0,
    catTop: 0,
    catLeft: 0,
    boxW: 0,
    boxH: 0,
  };
  if (sceneW <= 0 || sceneH <= 0 || !visualSize) {
    return empty;
  }

  const maxCatW = sceneW * CAT_WIDTH_RATIO;
  const maxCatH = Math.max(0, sceneH - SCENE_BOTTOM_GAP);
  const boxW = Math.min(visualSize.width, maxCatW);
  const boxH = Math.min(visualSize.height, maxCatH, boxW / SCENE_ASPECT_RATIO);

  const deskW = Math.min(boxW * DESK_TO_CAT_WIDTH, sceneW * DESK_MAX_SCENE_WIDTH);
  const deskH = deskW * DESK_ASPECT;
  const deskTop = sceneH * DESK_TOP_RATIO;

  const plantW = sceneW * PLANT_WIDTH_RATIO;
  let plantH = plantW * PLANT_ASPECT;
  plantH = Math.min(plantH, sceneH * 0.42);

  const catTop = Math.max(SCENE_BOTTOM_GAP, deskTop - boxH + deskH * CAT_FEET_ON_DESK_RATIO);
  const catLeft = (sceneW - boxW) / 2;

  return {deskW, deskH, plantW, plantH, catTop, catLeft, boxW, boxH};
}

/** 经过 C7→T12→L5 三点的平滑脊柱曲线（像素坐标）。 */
function spineCurvePath(c7: Pixel, t12: Pixel, l5: Pixel): string {
  const midUpper = (c7.y + t12.y) / 2;
  const midLower = (t12.y + l5.y) / 2;
  return `M ${c7.x} ${c7.y} C ${c7.x} ${midUpper}, ${t12.x} ${midUpper}, ${t12.x} ${t12.y} S ${l5.x} ${midLower}, ${l5.x} ${l5.y}`;
}

function DeskHeader({
  state,
  userName,
  onOpenAssess,
  showLikeHeart,
  liked,
  onLike,
}: {
  state: DashboardState;
  userName: string | null;
  onOpenAssess?: () => void;
  showLikeHeart?: boolean;
  liked?: boolean;
  onLike?: () => void;
}): React.JSX.Element {
  const t = useT();
  const feedback = state.advice || t('desk.feedbackDefault');
  const displayName = userName ?? t('desk.fallbackName');
  const heartColor = liked ? theme.colors.primary : theme.colors.textMuted;

  return (
    <View style={styles.header}>
      {onOpenAssess ? (
        <Pressable style={styles.assessEntry} onPress={onOpenAssess}>
          <Text style={styles.assessEntryText}>{t('desk.assessEntry')}</Text>
        </Pressable>
      ) : null}
      <Text style={styles.kicker}>{APP_NAME}</Text>
      <Text style={styles.greeting}>
        {t(greetingKey())}, <Text style={styles.highlight}>{displayName}</Text>
      </Text>
      <View style={styles.feedbackLine}>
        <Text style={styles.feedback} numberOfLines={3}>
          {state.streaming ? `${feedback} ▍` : feedback}
        </Text>
        {showLikeHeart ? (
          <Pressable
            hitSlop={10}
            style={styles.feedbackHeart}
            onPress={liked ? undefined : onLike}
            disabled={liked}>
            <HeartIcon size={16} color={heartColor} filled={liked} strokeWidth={1.75} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function TrainChip({
  state,
  locale,
  onOpenTraining,
}: {
  state: DashboardState;
  locale: 'en' | 'zh';
  onOpenTraining?: (action: PostureAction) => void;
}): React.JSX.Element {
  const t = useT();
  const trainable = state.action != null && state.action !== 'HOLD' && getExercise(state.action, locale) != null;
  const actionMeta = state.action ? getActionMeta(state.action, locale) : null;
  return (
    <View style={styles.trainChipWrap}>
      {trainable && state.action && actionMeta ? (
        <Pressable style={styles.actionChip} onPress={() => onOpenTraining?.(state.action as PostureAction)}>
          <View style={styles.actionDot} />
          <Text style={styles.actionChipText}>{t('desk.trainChip', {label: actionMeta.label})}</Text>
          <Text style={styles.actionChevron}>›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MetricStrip({state}: {state: DashboardState}): React.JSX.Element {
  const t = useT();
  const metrics = [
    {label: t('desk.metric.neck'), value: state.neckPitch},
    {label: t('desk.metric.thor'), value: state.thorPitch},
    {label: t('desk.metric.lumbar'), value: state.lumbarRoll},
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
  axis,
  frameIndex,
  boxW,
  boxH,
  highlightNode,
}: {
  axis: PostureAxis;
  frameIndex: number;
  boxW: number;
  boxH: number;
  highlightNode: SpineNode | null;
}): React.JSX.Element | null {
  if (boxW <= 0 || boxH <= 0) {
    return null;
  }
  const xShift = boxW * SENSOR_OVERLAY_X_SHIFT;
  const spine = anchorsAt(axis, frameIndex);
  const points: Array<{key: SpineNode; x: number; y: number}> = [
    {key: 'c7', x: spine.c7.u * boxW + xShift, y: spine.c7.v * boxH},
    {key: 't12', x: spine.t12.u * boxW + xShift, y: spine.t12.v * boxH},
    {key: 'l5', x: spine.l5.u * boxW + xShift, y: spine.l5.v * boxH},
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

function PostureScene({
  state,
}: {
  state: DashboardState;
  onZoomToPlant?: () => void;
}): React.JSX.Element {
  const {locale} = useLocale();
  const t = useT();
  const hasPitchAtlas = PITCH_ATLAS.source != null && PITCH_ATLAS.count > 1;
  const hasPitchFrames = PITCH_FRAMES.length > 1;
  const hasLeanAtlas = LEAN_ATLAS.source != null && LEAN_ATLAS.count > 1;
  const hasLeanFrames = LEAN_FRAMES.length > 1;
  const postureAxis = useStablePostureAxis(state, hasPitchAtlas, hasLeanAtlas);
  const [sceneLayout, setSceneLayout] = useState({width: 0, height: 0});
  const [visualSize, setVisualSize] = useState<{width: number; height: number} | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [renderMode, setRenderMode] = useState<RenderMode>('sprite');
  const useSprite = renderMode === 'sprite' && (hasPitchAtlas || hasLeanAtlas);
  const showModeToggle = false;
  const highlightNode: SpineNode | null = state.action ? getActionMeta(state.action, locale).node : null;
  const layout = computeSceneLayout(sceneLayout.width, sceneLayout.height, visualSize);
  const {deskW, deskH, catTop, catLeft, boxW, boxH} = layout;
  const sceneReady = sceneLayout.width > 0 && sceneLayout.height > 0 && boxW > 0;

  useEffect(() => {
    if (sceneLayout.width <= 0 || sceneLayout.height <= 0) {
      return;
    }
    const availableHeight = Math.max(0, sceneLayout.height - SCENE_BOTTOM_GAP);
    const next = fitAtlasDisplaySize(
      PITCH_ATLAS,
      sceneLayout.width * CAT_WIDTH_RATIO,
      availableHeight * CAT_HEIGHT_RATIO,
      SCENE_ASPECT_RATIO,
      ATLAS_DISPLAY_UPSCALE,
    );
    setVisualSize(prev =>
      prev && Math.abs(prev.width - next.width) < 0.5 && Math.abs(prev.height - next.height) < 0.5
        ? prev
        : next,
    );
  }, [sceneLayout.width, sceneLayout.height]);

  // 校准：点击猫身 → 打印该点比例 (u,v) + 当前帧号，照着填 catAnchors 的关键帧表
  const onCalibrateTap = (evt: {nativeEvent: {locationX: number; locationY: number}}) => {
    if (boxW <= 0 || boxH <= 0) {
      return;
    }
    const u = (evt.nativeEvent.locationX / boxW).toFixed(3);
    const v = (evt.nativeEvent.locationY / boxH).toFixed(3);
    console.log(`[catAnchors:${postureAxis}] frame=${frameIndex}  u=${u}  v=${v}`);
  };

  return (
    <View style={styles.scene}>
      <View
        collapsable={false}
        style={styles.sceneFrame}
        onLayout={event => {
          const {width, height} = event.nativeEvent.layout;
          setSceneLayout(prev =>
            Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
              ? prev
              : {width, height},
          );
        }}>

        {sceneReady ? (
          <>
            <Image
              source={DESK_IMAGE}
              style={[styles.deskImage, {width: deskW, height: deskH}]}
              resizeMode="cover"
            />

            {/* <Pressable
              style={[styles.plantImage]}
              onPress={onZoomToPlant}
              hitSlop={10}
              >
              <Image source={PLANT_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover" />
            </Pressable> */}

            <View style={[styles.sceneVisual, {width: boxW, height: boxH, top: catTop, left: catLeft}]}>
              {useSprite && postureAxis === 'pitch' && hasPitchAtlas && PITCH_ATLAS.source ? (
                <CatSprite
                  atlas={PITCH_ATLAS.source}
                  cols={PITCH_ATLAS.cols}
                  rows={PITCH_ATLAS.rows}
                  count={PITCH_ATLAS.count}
                  angle={state.thorPitch}
                  cellWidth={boxW}
                  cellHeight={boxH}
                  minDeg={-PITCH_RANGE_DEG}
                  maxDeg={PITCH_RANGE_DEG}
                  onFrameChange={setFrameIndex}
                  style={StyleSheet.absoluteFill}
                />
              ) : useSprite && postureAxis === 'lean' && hasLeanAtlas && LEAN_ATLAS.source ? (
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
              ) : postureAxis === 'pitch' && hasPitchFrames ? (
                <CatFlipbook
                  frames={PITCH_FRAMES}
                  angle={state.thorPitch}
                  minDeg={-PITCH_RANGE_DEG}
                  maxDeg={PITCH_RANGE_DEG}
                  onFrameChange={setFrameIndex}
                  style={StyleSheet.absoluteFill}
                />
              ) : hasLeanFrames ? (
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
              <SensorOverlay axis={postureAxis} frameIndex={frameIndex} boxW={boxW} boxH={boxH} highlightNode={highlightNode} />
              {CALIBRATE ? (
                <Pressable style={StyleSheet.absoluteFill} onPress={onCalibrateTap}>
                  <Text style={styles.calibrateBadge}>{postureAxis} · {t('desk.calibrateBadge', {n: frameIndex})}</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}

        {showModeToggle ? (
          <View style={styles.modeToggle}>
            <Pressable
              style={[styles.modeSeg, renderMode === 'sprite' && styles.modeSegActive]}
              onPress={() => setRenderMode('sprite')}>
              <Text style={[styles.modeSegText, renderMode === 'sprite' && styles.modeSegTextActive]}>
                {t('desk.renderMode.sprite')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modeSeg, renderMode === 'frames' && styles.modeSegActive]}
              onPress={() => setRenderMode('frames')}>
              <Text style={[styles.modeSegText, renderMode === 'frames' && styles.modeSegTextActive]}>
                {t('desk.renderMode.frames')}
              </Text>
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
  onOpenAssess,
  onZoomToPlant,
  memory,
}: {
  state: DashboardState;
  subtitle?: string;
  onOpenTraining?: (action: PostureAction) => void;
  onOpenAssess?: () => void;
  onZoomToPlant?: () => void;
  memory?: MemoryService;
}): React.JSX.Element {
  const {locale} = useLocale();
  const t = useT();
  const [ratedAdvice, setRatedAdvice] = useState<string | null>(null);
  // 从 memory 抽 entity 名字（onboarding 时写入的称呼）；memory 异步 ready
  const [userName, setUserName] = useState<string | null>(null);
  useEffect(() => {
    if (!memory) {
      return;
    }
    let cancelled = false;
    const refresh = () => {
      const name = extractUserName(memory.list());
      if (!cancelled) {
        setUserName(name);
      }
    };
    refresh();
    // memory.ready 后再刷一次（覆盖初始化竞态）
    memory.ready.then(refresh);
    return () => {
      cancelled = true;
    };
  }, [memory]);
  const abnormal = state.posture === 'SLUMPED' || state.posture === 'TECH_NECK' || state.posture === 'LEFT_LEAN';
  const showFeedback = !!memory && !!state.advice && abnormal && !state.streaming && state.advice !== ratedAdvice;
  const justRated = !!state.advice && abnormal && state.advice === ratedAdvice;

  const onLike = () => {
    if (!memory) {
      return;
    }
    memory.remember({
      type: 'lesson',
      text: t('desk.memory.goodPrefix', {posture: t(`desk.feedback.${state.posture.toLowerCase()}` as `desk.feedback.${PostureName}`)}),
      tags: [state.posture],
      importance: 0.6,
      source: 'feedback',
    });
    setRatedAdvice(state.advice);
  };

  const showLikeHeart = !!memory && !!state.advice && abnormal && !state.streaming && (showFeedback || justRated);

  return (
    <View style={styles.root}>
      <View>
        <DeskHeader
          state={state}
          userName={userName}
          onOpenAssess={onOpenAssess}
          showLikeHeart={showLikeHeart}
          liked={justRated}
          onLike={onLike}
        />
        <MetricStrip state={state} />
        <TrainChip state={state} locale={locale} onOpenTraining={onOpenTraining} />
      </View>
      <View style={styles.sceneHost}>
        <PostureScene state={state} onZoomToPlant={onZoomToPlant} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingBottom: DESK_TAB_INSET,
    position: 'relative',
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    zIndex: 2,
  },
  assessEntry: {
    position: 'absolute',
    top: theme.spacing.xxl,
    right: theme.spacing.xxl,
    paddingVertical: 5,
    paddingHorizontal: theme.spacing.md2,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(251,75,0,0.35)',
    backgroundColor: '#FCEAE0',
    zIndex: 2,
  },
  assessEntryText: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
  },
  kicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontFamily: theme.font.displayMedium,
    letterSpacing: 0.5,
  },
  greeting: {
    color: theme.colors.textPrimary,
    fontSize: theme.font.sizeSm,
    fontFamily: theme.font.displayMedium,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  highlight: {
    color: theme.colors.primary,
  },
  feedbackLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm2,
    minHeight: FEEDBACK_BLOCK_MIN_HEIGHT,
    gap: theme.spacing.sm,
  },
  feedback: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightBold,
    lineHeight: FEEDBACK_LINE_HEIGHT,
  },
  feedbackHeart: {
    marginTop: 2,
    paddingTop: 1,
  },
  trainChipWrap: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    // 始终保留 chip 高度的占位，避免 chip 出现/消失时下方 cat 和 desk 跟着上下抖。
    minHeight: 32,
    justifyContent: 'center',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
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
    marginRight: theme.spacing.sm,
  },
  actionChipText: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
  },
  actionChevron: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightBold,
    marginLeft: theme.spacing.xs,
    marginTop: -1,
  },
  metrics: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xs,
    gap: theme.spacing.lg,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  metricItem: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeLg,
    fontWeight: theme.font.weightHeavy,
    lineHeight: 22,
    marginTop: theme.spacing.xs,
  },
  sceneHost: {
    flex: 1,
    minHeight: 300,
    overflow: 'hidden',
  },
  scene: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  sceneFrame: {
    flex: 1,
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sceneVisual: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 2,
  },
  modeToggle: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.sm2,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xxs,
  },
  modeSeg: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },
  modeSegActive: {
    backgroundColor: '#FCEAE0',
  },
  modeSegText: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
  },
  modeSegTextActive: {
    color: theme.colors.primary,
  },
  calibrateBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    color: '#FB4B00',
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: 6,
  },
  deskImage: {
    position: 'absolute',
    top: `${DESK_TOP_RATIO * 100}%`,
    alignSelf: 'center',
    zIndex: 0,
  },
  plantImage: {
    position: 'absolute',
    top: -200,
    left: -20,
    width: 40,
    height: 40,
    zIndex: 3,
  },
});
