/**
 * @file service.ts
 * @description 语义记忆服务（RN 原生轻量，借 catui-mem 设计）：remember/retrieve/inject/forget/clearAll。
 *   写入去重 + 脱敏 + 容量淘汰；inject 为教练 prompt 拼极简前缀（被注入即刷新近因 = 间隔重复 lite）。
 *   持久化节流，仅本地。详见 docs/语义记忆设计.md。
 *
 * [WHO] 导出 `MemoryService`/`InjectOptions`/`createMemoryService`
 * [FROM] 依赖 ./types、./store、./scoring
 * [TO] 被 App.tsx 创建；写入钩子（onboarding/反馈）调 remember；adviceOrchestrator 调 inject；Settings 管理卡调 list/forget/clearAll
 * [HERE] src/posture/memory/service.ts · 语义记忆服务
 */
import {MemoryItem, MemoryType, RememberInput} from './types';
import {loadItems, saveItems} from './store';
import {isExpired, score} from './scoring';

const MAX_ITEMS = 60;
const SAVE_DEBOUNCE_MS = 800;
/** 注入门槛：分数过低不进 prompt。 */
const INJECT_MIN_SCORE = 0.28;

export type InjectOptions = {maxItems?: number; maxChars?: number};

export type MemoryService = {
  /** 初次从磁盘加载完成。 */
  ready: Promise<void>;
  remember: (input: RememberInput) => MemoryItem;
  retrieve: (tags: string[], k: number) => MemoryItem[];
  /** 为教练 prompt 拼一小段"已知用户：…"前缀；无合适记忆返回空串。 */
  inject: (tags: string[], opts?: InjectOptions) => string;
  list: () => MemoryItem[];
  forget: (id: string) => void;
  clearAll: () => void;
};

/** 去掉手机号/邮箱等 PII，并截到 ≤40 字。 */
function sanitize(text: string): string {
  return text
    .replace(/\d{7,}/g, '***')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '***')
    .trim()
    .slice(0, 40);
}

const dedupeKey = (type: MemoryType, text: string) => `${type}::${text}`;

export function createMemoryService(): MemoryService {
  let items: MemoryItem[] = [];
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const persist = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => saveItems(items), SAVE_DEBOUNCE_MS);
  };

  const ready = loadItems().then(loaded => {
    const now = Date.now();
    items = loaded.filter(i => !isExpired(i, now));
  });

  const retrieve = (tags: string[], k: number): MemoryItem[] => {
    const now = Date.now();
    return items
      .filter(i => !isExpired(i, now))
      .map(i => ({i, s: score(i, tags, now)}))
      .sort((a, b) => b.s - a.s)
      .slice(0, k)
      .map(x => x.i);
  };

  return {
    ready,
    remember(input) {
      const now = Date.now();
      const text = sanitize(input.text);
      const tags = input.tags ?? [];
      const existing = items.find(i => dedupeKey(i.type, i.text) === dedupeKey(input.type, text));
      if (existing) {
        existing.importance = Math.max(existing.importance, input.importance ?? existing.importance);
        existing.tags = Array.from(new Set([...existing.tags, ...tags]));
        existing.lastUsedAt = now;
        existing.uses += 1;
        persist();
        return existing;
      }
      const item: MemoryItem = {
        id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
        type: input.type,
        text,
        tags,
        importance: input.importance ?? 0.5,
        createdAt: now,
        lastUsedAt: now,
        uses: 0,
        source: input.source,
        ttlDays: input.ttlDays,
      };
      items.unshift(item);
      if (items.length > MAX_ITEMS) {
        items.sort((a, b) => score(b, [], now) - score(a, [], now));
        items = items.slice(0, MAX_ITEMS);
      }
      persist();
      return item;
    },
    retrieve,
    inject(tags, opts) {
      const maxItems = opts?.maxItems ?? 3;
      const maxChars = opts?.maxChars ?? 60;
      const now = Date.now();
      const picked = items
        .filter(i => !isExpired(i, now))
        .map(i => ({i, s: score(i, tags, now)}))
        .filter(x => x.s >= INJECT_MIN_SCORE)
        .sort((a, b) => b.s - a.s)
        .slice(0, maxItems)
        .map(x => x.i);
      if (picked.length === 0) {
        return '';
      }
      const buf: string[] = [];
      let chars = 0;
      for (const i of picked) {
        if (chars + i.text.length > maxChars) {
          break;
        }
        buf.push(i.text);
        chars += i.text.length;
        i.lastUsedAt = now; // 被注入即刷新近因
        i.uses += 1;
      }
      if (buf.length === 0) {
        return '';
      }
      persist();
      return `已知用户：${buf.join('；')}。`;
    },
    list() {
      return [...items].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    },
    forget(id) {
      items = items.filter(i => i.id !== id);
      persist();
    },
    clearAll() {
      items = [];
      persist();
    },
  };
}
