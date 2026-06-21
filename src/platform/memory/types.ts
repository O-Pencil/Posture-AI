/**
 * @file types.ts
 * @description 语义记忆数据契约（教练"懂你"）。借 catui-mem 的 7 类记忆概念，RN 原生精简实现。
 *   仅本地存储、可衰减/淘汰；注入教练 prompt 时只取极少几条。详见 docs/语义记忆设计.md。
 *
 * [WHO] 导出 `MemoryType`/`MemorySource`/`MemoryItem`/`RememberInput`
 * [FROM] 无依赖（纯类型）
 * [TO] 被 src/posture/memory/{scoring,store,service}.ts 与写入/读取钩子消费
 * [HERE] src/posture/memory/types.ts · 语义记忆数据契约
 */

/** 7 类记忆（与 catui-mem 对齐；初赛主要用 preference/struggle/lesson）。 */
export type MemoryType =
  | 'preference' // 教练风格/提醒偏好
  | 'struggle' // 反复出问题的部位
  | 'lesson' // 什么有效
  | 'pattern' // 语义化习惯
  | 'decision' // 目标/承诺
  | 'knowledge' // 环境事实
  | 'entity'; // 称呼等

export type MemorySource = 'onboarding' | 'feedback' | 'consolidation' | 'chat';

export interface MemoryItem {
  id: string;
  type: MemoryType;
  /** ≤40 字、已脱敏的记忆文本。 */
  text: string;
  /** 相关性检索标签，如 ['TECH_NECK','tone']。 */
  tags: string[];
  /** 重要度 0-1。 */
  importance: number;
  createdAt: number;
  lastUsedAt: number;
  uses: number;
  source: MemorySource;
  /** 过期天数（不填=不过期）。 */
  ttlDays?: number;
}

export interface RememberInput {
  type: MemoryType;
  text: string;
  tags?: string[];
  importance?: number;
  source: MemorySource;
  ttlDays?: number;
}
