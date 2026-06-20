/**
 * @file logBus.ts
 * @description 轻量运行日志总线（演示用）：各模块往里 push 事件（传感器/模型/推理/流程），UI 订阅实时展示。
 *   用于满足赛事「必须展示：模型本地加载 / 推理输入输出 / 核心交互流程」。环形缓冲，纯 TS、三端通用。
 *
 * [WHO] 导出 `LogCategory`/`LogEntry`/`logEvent`/`subscribeLog`/`clearLog`/`setLogEnabled`
 * [FROM] 无依赖
 * [TO] 被 engine/sensorSource/adviceOrchestrator/reminder 写入；被 src/ui/components/LogConsole 订阅
 * [HERE] src/debug/logBus.ts · 运行日志总线
 */
export type LogCategory = 'sensor' | 'model' | 'infer' | 'flow';

export interface LogEntry {
  id: number;
  ts: number;
  category: LogCategory;
  text: string;
}

const MAX_ENTRIES = 200;
let entries: LogEntry[] = [];
let nextId = 1;
let enabled = true;
const listeners = new Set<(e: LogEntry[]) => void>();

export function logEvent(category: LogCategory, text: string): void {
  if (!enabled) {
    return;
  }
  const entry: LogEntry = {id: nextId++, ts: Date.now(), category, text};
  entries = [entry, ...entries];
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(0, MAX_ENTRIES);
  }
  listeners.forEach(l => l(entries));
}

export function subscribeLog(cb: (e: LogEntry[]) => void): () => void {
  listeners.add(cb);
  cb(entries);
  return () => listeners.delete(cb);
}

export function clearLog(): void {
  entries = [];
  listeners.forEach(l => l(entries));
}

export function setLogEnabled(v: boolean): void {
  enabled = v;
}
