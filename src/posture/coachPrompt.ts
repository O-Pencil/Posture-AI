/**
 * @file coachPrompt.ts
 * @description 端侧教练 prompt 的「单一来源」，与微调训练数据 (training/gen_dataset.py / seed_gold.jsonl) **同格式**。
 *   指令 + （可选记忆前缀「已知用户：…。」）+ 姿态信号行（姿态：…；指标约X°；已持续N分钟。）。
 *   纪律：推理 prompt 必须 ≈ 训练 prompt，否则微调迁移被削弱（见 docs/模型与记忆个性化设计.md §7）。
 *
 * [WHO] 导出 `COACH_INSTRUCTION`、`buildSignalLine`、`buildCoachPrompt`
 * [FROM] 依赖 ./types(DashboardState/PostureName)
 * [TO] 被 adviceOrchestrator 用于生成端侧文案 prompt
 * [HERE] src/posture/coachPrompt.ts · 教练 prompt 单一来源（与训练对齐）
 */
import {DashboardState, PostureName} from './types';

/** 与 training 的 instruction 字段逐字一致（改这里必须同步 training/gen_dataset.py、compare.py 并重跑生成+训练）。 */
export const COACH_INSTRUCTION =
  '你是温和的坐姿教练（一只爱操心的猫）。根据姿态信息，用一句不超过30字、有温度、指向具体动作、' +
  '不做医疗诊断、句尾带「喵～」的中文提醒用户调整坐姿；最后用 [动作:xxx] 标注一个建议动作。';

/** 姿态 → 「中文（ENUM）；主指标约X°」，与训练 input 同格式。 */
const SIGNAL: Record<PostureName, (s: DashboardState) => string> = {
  TECH_NECK: s => `头前倾（TECH_NECK）；颈前倾约${Math.round(s.neckPitch)}°`,
  SLUMPED: s => `驼背（SLUMPED）；胸椎后凸约${Math.round(s.thorPitch)}°`,
  LEFT_LEAN: s => `身体左倾（LEFT_LEAN）；腰椎侧倾约${Math.round(s.lumbarRoll)}°`,
  NORMAL: () => '正常（NORMAL）；脊柱接近中立',
  OFFLINE: () => '未连接（OFFLINE）',
};

/** 姿态信号行：与训练 input 同格式「姿态：…；已持续N分钟。」。 */
export function buildSignalLine(s: DashboardState): string {
  const min = Math.max(1, Math.round(s.abnormalDurationMinutes));
  return `姿态：${SIGNAL[s.posture](s)}；已持续${min}分钟。`;
}

/**
 * 端侧教练完整 prompt：指令 +（可选记忆前缀）+ 姿态信号。
 * memoryPrefix 形如「已知用户：…。」，与训练混入的记忆前缀同格式。
 */
export function buildCoachPrompt(s: DashboardState, memoryPrefix = ''): string {
  return [COACH_INSTRUCTION, memoryPrefix, buildSignalLine(s)].filter(Boolean).join('\n');
}
