/**
 * @file scoring.ts
 * @description 记忆评分与衰减（借 catui-mem 思路）：score = 近因×重要度×相关性。用于检索 top-K 与淘汰。
 *
 * [WHO] 导出 `recencyScore`/`relevanceScore`/`score`/`isExpired`/`HALF_LIFE_DAYS`
 * [FROM] 依赖 ./types(MemoryItem)
 * [TO] 被 src/posture/memory/service.ts 消费
 * [HERE] src/posture/memory/scoring.ts · 记忆评分
 */
import {MemoryItem} from './types';

const DAY = 86_400_000;
/** 近因半衰期（天）：30 天前的"最后使用"权重减半。 */
export const HALF_LIFE_DAYS = 30;
const W = {recency: 0.3, importance: 0.4, relevance: 0.3};

/** 近因分：按 lastUsedAt 的指数衰减（被用到会刷新 → 间隔重复 lite）。 */
export function recencyScore(item: MemoryItem, now: number): number {
  const ageDays = Math.max(0, (now - item.lastUsedAt) / DAY);
  return Math.exp(-ageDays / HALF_LIFE_DAYS);
}

/** 相关性分：item.tags 与查询 tags 的 Jaccard 重叠。 */
export function relevanceScore(item: MemoryItem, queryTags: string[]): number {
  if (queryTags.length === 0 || item.tags.length === 0) {
    return 0;
  }
  const itemSet = new Set(item.tags);
  let hit = 0;
  queryTags.forEach(t => {
    if (itemSet.has(t)) {
      hit += 1;
    }
  });
  const union = new Set([...item.tags, ...queryTags]).size;
  return union > 0 ? hit / union : 0;
}

export function score(item: MemoryItem, queryTags: string[], now: number): number {
  return (
    W.recency * recencyScore(item, now) +
    W.importance * item.importance +
    W.relevance * relevanceScore(item, queryTags)
  );
}

export function isExpired(item: MemoryItem, now: number): boolean {
  if (!item.ttlDays) {
    return false;
  }
  return (now - item.createdAt) / DAY > item.ttlDays;
}
