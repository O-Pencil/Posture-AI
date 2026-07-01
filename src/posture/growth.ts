/**
 * @file growth.ts
 * @description 植物成长累加器：订阅 PostureEngine，把真实坐姿随时间转成「积分 + 成长阶段 + 日志」，驱动 Plant 页。
 *   纪律：积分由「姿态状态 + 持续时长」驱动，不按 10Hz 帧累加。良好坐姿按心跳周期累计发积分；
 *   异常「入态」按状态转移扣分并记一条日志（不会每帧刷屏）。OFFLINE 不计分只忽略。
 *
 * [WHO] 导出 `createGrowthTracker(engine, opts?)`、`GrowthState`、`GrowthEvent`、`GrowthTracker`、`STAGE_NAMES`、`STAGE_THRESHOLDS`
 * [FROM] 依赖 ./engine(PostureEngine 类型)、./types(PostureName)、../design/i18n(tr, Locale)
 * [TO] 被 App.tsx 启动并订阅，结果传给 src/design/screens/PlantScreen
 * [HERE] src/posture/growth.ts · 植物成长累加器（真实数据 → 积分/阶段/日志）
 */
import {tr, type Locale} from '../design/i18n';
import type {PostureEngine} from './engine';
import {PostureName} from './types';
import {rolloverIfNewDay, upsertTodaySnapshot} from '../platform/dailyHistory';
import {pad} from './utils';

/** 5 个成长阶段（与 PlantScreen 一致）。 */
export const STAGE_NAMES = ['Seed', 'Sprout', 'Sapling', 'Bud', 'Fruit'] as const;
/** 积分达到该档即进入对应阶段下标（升序）。起始 50 分 → Sapling。 */
export const STAGE_THRESHOLDS = [0, 20, 50, 90, 140] as const;

export type GrowthEvent = {
  id: number;
  time: string; // 'MM-DD HH:mm'
  action: string;
  delta: number;
  score: number; // 该事件后的累计积分
};

export type GrowthState = {
  points: number;
  stage: number; // 0..4
  stageName: string;
  log: GrowthEvent[]; // 最新在前，封顶 LOG_CAP
};

export type GrowthTracker = {
  getState: () => GrowthState;
  subscribe: (cb: (s: GrowthState) => void) => () => void;
  /** 开始订阅引擎 + 启动良好坐姿计时心跳。 */
  start: () => void;
  stop: () => void;
};

export type GrowthOptions = {
  /** 连续良好坐姿每满该时长发一次积分（默认 60s）。 */
  goodAwardIntervalMs?: number;
  /** 心跳间隔（默认 5s，越小良好计时越精细）。 */
  tickMs?: number;
  /** 当前 locale getter：用于 event.action 文案 / stageName。 */
  getLocale?: () => Locale;
};

const INITIAL_POINTS = 50;
const GOOD_AWARD_POINTS = 5;
const LOG_CAP = 12;

/** 异常入态扣分 + 日志文案 i18n key。 */
const PENALTY: Partial<Record<PostureName, {delta: number; key: string}>> = {
  SLUMPED: {delta: -5, key: 'plant.event.slumping'},
  TECH_NECK: {delta: -4, key: 'plant.event.forwardHead'},
  LEFT_LEAN: {delta: -3, key: 'plant.event.leaning'},
};

function clampPoints(p: number): number {
  return Math.max(0, Math.min(999, Math.round(p)));
}

function stageOf(points: number): number {
  let stage = 0;
  for (let i = 0; i < STAGE_THRESHOLDS.length; i += 1) {
    if (points >= STAGE_THRESHOLDS[i]) {
      stage = i;
    }
  }
  return stage;
}

function nowLabel(): string {
  const d = new Date();
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function stageNameAt(stage: number, locale: Locale): string {
  const key = `plant.stageNames.${STAGE_NAMES[stage]?.toLowerCase() ?? 'seed'}`;
  const v = tr(locale, key);
  return v === key ? STAGE_NAMES[stage] : v;
}

export function createGrowthTracker(engine: PostureEngine, opts: GrowthOptions = {}): GrowthTracker {
  const goodAwardIntervalMs = opts.goodAwardIntervalMs ?? 60_000;
  const tickMs = opts.tickMs ?? 5_000;
  const getLocale = opts.getLocale ?? ((): Locale => 'en');

  let points = INITIAL_POINTS;
  let log: GrowthEvent[] = [];
  let nextId = 1;

  let currentPosture: PostureName = 'NORMAL';
  let goodAccumMs = 0; // 当前连续良好坐姿累计（满一档发分后扣回）
  let totalGoodMs = 0; // 仅用于日志文案展示「累计 N 分钟」

  let unsubEngine: (() => void) | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const listeners = new Set<(s: GrowthState) => void>();

  const snapshot = (): GrowthState => ({
    points,
    stage: stageOf(points),
    stageName: stageNameAt(stageOf(points), getLocale()),
    log,
  });
  const emit = () => {
    const s = snapshot();
    listeners.forEach(cb => cb(s));
  };

  const pushEvent = (delta: number, action: string) => {
    points = clampPoints(points + delta);
    const event: GrowthEvent = {id: nextId++, time: nowLabel(), action, delta, score: points};
    log = [event, ...log].slice(0, LOG_CAP);
    // 落每日快照（异常入态 good=0 / abnormal=1；良好发分 good=1 / abnormal=0）
    const abnormalCount = delta < 0 ? 1 : 0;
    const goodCount = delta > 0 ? 1 : 0;
    upsertTodaySnapshot({
      points,
      goodMinutes: goodCount,
      abnormalCount,
      goodCount,
    });
    emit();
  };

  // 只在「姿态类别变化」时动作：异常入态扣分；良好计时交给心跳。
  const onSample = (posture: PostureName) => {
    if (posture === currentPosture) {
      return;
    }
    currentPosture = posture;
    if (posture !== 'NORMAL') {
      goodAccumMs = 0; // 中断良好连击
      const pen = PENALTY[posture];
      if (pen) {
        pushEvent(pen.delta, tr(getLocale(), pen.key));
      }
    }
  };

  const onTick = () => {
    if (currentPosture !== 'NORMAL') {
      return;
    }
    goodAccumMs += tickMs;
    totalGoodMs += tickMs;
    if (goodAccumMs >= goodAwardIntervalMs) {
      goodAccumMs -= goodAwardIntervalMs;
      const minutes = Math.max(1, Math.round(totalGoodMs / 60_000));
      pushEvent(GOOD_AWARD_POINTS, tr(getLocale(), 'plant.event.goodPosture', {min: minutes}));
    }
  };

  return {
    getState: snapshot,
    subscribe(cb) {
      listeners.add(cb);
      cb(snapshot());
      return () => listeners.delete(cb);
    },
    start() {
      if (unsubEngine) {
        return;
      }
      // 启动时检查是否跨天，标 finalized
      rolloverIfNewDay();
      unsubEngine = engine.subscribe(s => onSample(s.posture));
      timer = setInterval(onTick, tickMs);
      emit();
    },
    stop() {
      unsubEngine?.();
      unsubEngine = null;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}
