/**
 * @file store.ts
 * @description 语义记忆持久化：expo-file-system 读写 documentDirectory/catune_memory/items.json。
 *   仅本地存储（隐私）；web(RNW) 无 documentDirectory 时降级为内存态（load 返回空、save 静默失败）。
 *
 * [WHO] 导出 `loadItems`/`saveItems`/`loadOnboarded`/`saveOnboarded`/`loadLocale`/`saveLocale`
 * [FROM] 依赖 `expo-file-system/legacy`、./types(MemoryItem)
 * [TO] 被 src/posture/memory/service.ts 消费
 * [HERE] src/posture/memory/store.ts · 记忆本地持久化
 */
import * as FileSystem from 'expo-file-system/legacy';

import type {Locale} from '../../ui/i18n';
import {MemoryItem} from './types';

const DIR = (FileSystem.documentDirectory ?? '') + 'catune_memory/';
const FILE = DIR + 'items.json';

export async function loadItems(): Promise<MemoryItem[]> {
  try {
    const info = await FileSystem.getInfoAsync(FILE);
    if (!info.exists) {
      return [];
    }
    const raw = await FileSystem.readAsStringAsync(FILE);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MemoryItem[]) : [];
  } catch {
    return [];
  }
}

export async function saveItems(items: MemoryItem[]): Promise<void> {
  try {
    await FileSystem.makeDirectoryAsync(DIR, {intermediates: true});
    await FileSystem.writeAsStringAsync(FILE, JSON.stringify(items));
  } catch {
    // web / 无 FS：忽略，保持内存态
  }
}

const META = DIR + 'meta.json';

async function readMeta(): Promise<Record<string, unknown>> {
  try {
    const info = await FileSystem.getInfoAsync(META);
    if (!info.exists) {
      return {};
    }
    return JSON.parse(await FileSystem.readAsStringAsync(META));
  } catch {
    return {};
  }
}

async function writeMeta(patch: Record<string, unknown>): Promise<void> {
  try {
    await FileSystem.makeDirectoryAsync(DIR, {intermediates: true});
    const cur = await readMeta();
    await FileSystem.writeAsStringAsync(META, JSON.stringify({...cur, ...patch}));
  } catch {
    // web / 无 FS：忽略
  }
}

/** 是否已完成 onboarding（首启问卷只走一次）。 */
export async function loadOnboarded(): Promise<boolean> {
  const meta = await readMeta();
  return Boolean(meta.onboarded);
}

export async function saveOnboarded(value: boolean): Promise<void> {
  await writeMeta({onboarded: value});
}

/** 读取上次保存的 locale。读不到 / 解析失败 → 'en'。 */
export async function loadLocale(): Promise<Locale> {
  const meta = await readMeta();
  const l = meta.locale;
  return l === 'zh' ? 'zh' : 'en';
}

export async function saveLocale(locale: Locale): Promise<void> {
  await writeMeta({locale});
}
