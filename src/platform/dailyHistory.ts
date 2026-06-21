/**
 * @file dailyHistory.ts
 * @description 每日快照持久化：把"今日分 / 不驼背时长 / 异常次数 / 良好次数"按天存到本地 FS，
 *   给周报（日趋势）提供真实历史。每日 0 点 + 首次启动时落 1 个快照。
 *   轻量：纯 JSON，expo-file-system 存到 documentDirectory/daily_history.json。
 *
 * [WHO] 导出 `DailySnapshot` / `DailyHistory` / `loadDailyHistory` / `upsertTodaySnapshot` / `getWeekSnapshots`
 * [FROM] 依赖 expo-file-system（持久化）
 * [TO] 被 App.tsx 启动时加载 + growth 心跳后调用 upsertTodaySnapshot；周报从 getWeekSnapshots 读
 * [HERE] src/platform/dailyHistory.ts · 每日快照
 */
import * as FileSystem from 'expo-file-system/legacy';
import {pad} from '../posture/utils';

/** 单日快照（聚合数据）。 */
export type DailySnapshot = {
  /** 'YYYY-MM-DD'，作为 key。 */
  date: string;
  /** 今日结束时的累计积分。 */
  points: number;
  /** 不驼背累计时长（分钟，向上取整）。 */
  goodMinutes: number;
  /** 异常入态次数。 */
  abnormalCount: number;
  /** 良好发分次数。 */
  goodCount: number;
  /** 是否已"日结"（00:00 落的一次 vs 首次启动补的）。 */
  finalized: boolean;
};

export type DailyHistory = {
  /** key = date；按时间倒序存（最新在前）。 */
  days: DailySnapshot[];
};

const HISTORY_FILE = 'daily_history.json';
const MAX_DAYS = 30; // 保留 30 天，够周报 + 月报用

function getFileUri(): string | null {
  const dir = FileSystem.documentDirectory;
  if (!dir) return null;
  return dir + HISTORY_FILE;
}

/** 'YYYY-MM-DD' 本地时区日期。 */
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 取最近 7 天（含今天）按时间升序返回。缺的天补 null（UI 显示"暂无数据"用）。 */
export type WeekDay = {date: string; snapshot: DailySnapshot | null; label: string};
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getWeekSnapshots(history: DailyHistory, today: Date = new Date()): WeekDay[] {
  const map = new Map(history.days.map(s => [s.date, s]));
  const result: WeekDay[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    const key = todayKey(d);
    result.push({
      date: key,
      snapshot: map.get(key) ?? null,
      label: WEEKDAY_LABELS[d.getDay()],
    });
  }
  return result;
}

/** 进程内缓存：避免每次日报读取都打一次 FS（UI 端 useSyncExternalStore 不便 await） */
let cache: DailyHistory | null = null;

export function getCachedHistory(): DailyHistory {
  if (cache) return cache;
  return {days: []};
}

export async function loadDailyHistory(): Promise<DailyHistory> {
  if (cache) return cache;
  const uri = getFileUri();
  if (!uri) return {days: []};
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      cache = {days: []};
      return cache;
    }
    const raw = await FileSystem.readAsStringAsync(uri);
    const parsed = JSON.parse(raw) as DailyHistory;
    if (!parsed.days || !Array.isArray(parsed.days)) {
      cache = {days: []};
      return cache;
    }
    cache = parsed;
    return cache;
  } catch {
    cache = {days: []};
    return cache;
  }
}

async function writeDailyHistory(history: DailyHistory): Promise<void> {
  const uri = getFileUri();
  if (!uri) return;
  // 截断到 MAX_DAYS
  const days = history.days.slice(0, MAX_DAYS);
  const trimmed: DailyHistory = {days};
  cache = trimmed; // 先更新缓存，再写盘
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(trimmed), {
    encoding: 'utf8',
  });
}

/**
 * 写入/更新今日快照。若已存在则合并 goodCount / abnormalCount（累加），points 取最新值。
 * 异步；调用方无需 await。
 */
export async function upsertTodaySnapshot(
  partial: Omit<DailySnapshot, 'date' | 'finalized'>,
  today: Date = new Date(),
): Promise<void> {
  const date = todayKey(today);
  const history = await loadDailyHistory();
  const idx = history.days.findIndex(s => s.date === date);
  if (idx >= 0) {
    const prev = history.days[idx];
    // 同日多次调用：goodCount / abnormalCount 累加，points 取最后值
    history.days[idx] = {
      ...prev,
      ...partial,
      date,
      goodCount: prev.goodCount + partial.goodCount,
      abnormalCount: prev.abnormalCount + partial.abnormalCount,
    };
  } else {
    history.days = [{date, ...partial, finalized: false}, ...history.days];
  }
  await writeDailyHistory(history);
}

/** 00:00 切换时把昨天标 finalized（不修改数值），同时插入新的今日占位。 */
export async function rolloverIfNewDay(today: Date = new Date()): Promise<void> {
  const date = todayKey(today);
  const history = await loadDailyHistory();
  const idx = history.days.findIndex(s => s.date === date);
  if (idx < 0) {
    // 新的一天：把"最近一次"标 finalized
    if (history.days.length > 0) {
      history.days[0] = {...history.days[0], finalized: true};
    }
    // 不主动写今日占位 —— 等 upsertTodaySnapshot 第一次被调用时再写
  } else if (history.days[idx].finalized) {
    // 同日重复进入：去掉 finalized 标记（因为是新会话）
    history.days[idx] = {...history.days[idx], finalized: false};
  }
  await writeDailyHistory(history);
}
