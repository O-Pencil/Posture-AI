/**
 * @file engine.ts
 * @description 跨平台姿态引擎（TS）：3 节点规则状态机（颈/胸/腰）+ 0-100 打分 + 本地查表文案 + 禁词检查 + 规则兜底。
 *   从 Kotlin 侧迁移，iOS/Android 通用，无原生依赖。
 *
 * [WHO] 导出 `createPostureEngine()`、`ruleFallback()`、`THRESHOLDS`、`BANNED_WORDS`、`sanitize()`
 * [FROM] 依赖 ./types
 * [TO] 被 mock.ts/sensorSource.ts 写入、adviceOrchestrator 推模型文案、Dashboard/App 订阅
 * [HERE] src/posture/engine.ts · 姿态规则引擎（TS）
 *
 * 节点（PRD 3 节点）：neckPitch=颈椎前倾、thorPitch=胸椎后凸(驼背主指标)、lumbarRoll=腰椎侧倾。
 * 纪律（PRD §5.10）：分类/打分用规则（可靠底线）；端侧模型只补「文案生成」；文案一律过禁词。
 * 建议文案「粘性」：规则文案只在姿态类别变化时重算；模型文案经 setModelAdvice 异步替换，不被 10Hz 帧覆盖。
 */
import {
  DashboardState,
  KinematicsState,
  POSTURE_LABELS,
  PostureFeedback,
  PostureName,
  PostureSignals,
} from './types';

/** 与 PRD 阈值一致：胸椎后凸>15°=驼背；颈前倾>20°；腰椎侧倾<-10°。 */
export const THRESHOLDS = {
  neckTechDeg: 20,
  thorSlumpDeg: 15,
  lumbarLeanDeg: -10,
};

// ---------------- 安全链：本地查表文案 + 禁词 ----------------

const SAFE_FALLBACK = '注意调整坐姿，让脊柱回到自然中立位，必要时起身活动一下。';

/** 禁词：诊断 / 治疗 / 承诺 / 营销（对齐技术实现文档 §7.2）。 */
export const BANNED_WORDS = [
  '确诊', '诊断为', '患有', '综合征',
  '治疗', '治愈', '药物', '手术', '注射', '贴片',
  '保证', '一定', '100%', '彻底', '永远',
  '限时', '优惠', '推荐购买', '扫码',
];

const ACTION_TEXT: Record<string, string> = {
  neck_retraction: '头部有些前倾，试着收下巴、让耳朵回到肩膀正上方，做几次颈部回缩。',
  thoracic_extension: '上背有点含胸驼背，挺一下胸椎、打开肩膀，做几次胸椎伸展。',
  scapular_retraction: '身体向一侧偏，把重心摆正、肩胛骨向后向下收一收。',
};

const NORMAL_TEXT = '坐姿不错，保持脊柱自然中立，继续加油。';

function isSafe(text: string): boolean {
  return !BANNED_WORDS.some(w => text.includes(w));
}

/** 命中禁词则整体替换为中性兜底文案。 */
export function sanitize(text: string): string {
  return isSafe(text) ? text : SAFE_FALLBACK;
}

function adviceFor(actionId: string | null, severityLevel: number, posture: PostureName): string {
  let base: string;
  if (actionId && ACTION_TEXT[actionId]) {
    base = ACTION_TEXT[actionId];
  } else if (posture === 'NORMAL') {
    base = NORMAL_TEXT;
  } else {
    base = SAFE_FALLBACK;
  }
  const text = severityLevel >= 3 ? `${base} 久坐较久了，建议起身走动 1-2 分钟。` : base;
  return sanitize(text);
}

// ---------------- 3 节点分类（规则） ----------------

/** 单一判定来源：3 节点角度 → 姿态 + 推荐动作。SLUMPED 由胸椎(thor)驱动（PRD 驼背主指标）。 */
function classifyAndAction(
  neck: number,
  thor: number,
  lumbar: number,
): {posture: PostureName; actionId: string | null} {
  if (thor > THRESHOLDS.thorSlumpDeg) {
    return {posture: 'SLUMPED', actionId: 'thoracic_extension'};
  }
  if (neck > THRESHOLDS.neckTechDeg) {
    return {posture: 'TECH_NECK', actionId: 'neck_retraction'};
  }
  if (lumbar < THRESHOLDS.lumbarLeanDeg) {
    return {posture: 'LEFT_LEAN', actionId: 'scapular_retraction'};
  }
  return {posture: 'NORMAL', actionId: null};
}

function severityOf(posture: PostureName, s: PostureSignals): number {
  if (posture === 'NORMAL') {
    return 0;
  }
  let excess = 0;
  if (posture === 'SLUMPED') {
    excess = s.thorPitchDeg - THRESHOLDS.thorSlumpDeg;
  } else if (posture === 'TECH_NECK') {
    excess = s.neckPitchDeg - THRESHOLDS.neckTechDeg;
  } else if (posture === 'LEFT_LEAN') {
    excess = Math.abs(s.lumbarRollDeg) - Math.abs(THRESHOLDS.lumbarLeanDeg);
  }
  const base = excess >= 20 ? 3 : excess >= 10 ? 2 : 1;
  return s.durationMin >= 45 ? Math.min(3, base + 1) : base;
}

/** 纯规则兜底：复用阈值，离线 100% 可用。 */
export function ruleFallback(signals: PostureSignals): PostureFeedback {
  const {posture, actionId} = classifyAndAction(
    signals.neckPitchDeg,
    signals.thorPitchDeg,
    signals.lumbarRollDeg,
  );
  const severity = severityOf(posture, signals);
  return {advice: adviceFor(actionId, severity, posture), source: 'RULE_FALLBACK'};
}

// ---------------- 状态机（原 KinematicsHub） ----------------

function signalsFrom(state: KinematicsState): PostureSignals {
  return {
    neckPitchDeg: state.neckPitch,
    thorPitchDeg: state.thorPitch,
    lumbarRollDeg: state.lumbarRoll,
    durationMin: state.abnormalDurationMinutes,
    lastState: state.posture,
    windowMs: 5000,
  };
}

export type PostureEngine = {
  getState: () => DashboardState;
  /** 写入 3 节点角度（颈/胸/腰）。 */
  update: (neckPitch: number, thorPitch: number, lumbarRoll: number) => void;
  setOffline: () => void;
  /** 端侧模型异步推送建议文案（流式：streaming=true，结束：false）。 */
  setModelAdvice: (advice: string, opts: {streaming: boolean}) => void;
  subscribe: (cb: (s: DashboardState) => void) => () => void;
};

/**
 * 单例式状态枢纽（等价 Kotlin 的 KinematicsHub StateFlow）。
 * update 每帧算分类/分数；建议文案「粘性」：规则只在姿态变化时重算，模型文案由 setModelAdvice 异步替换。
 */
export function createPostureEngine(): PostureEngine {
  let totalSamples = 0;
  let healthySamples = 0;
  let state: DashboardState = {
    neckPitch: 0,
    thorPitch: 0,
    lumbarRoll: 0,
    posture: 'NORMAL',
    postureLabel: POSTURE_LABELS.NORMAL,
    score: 100,
    abnormalDurationMinutes: 0,
    advice: '',
    inferenceSource: 'RULE_FALLBACK',
    streaming: false,
  };
  const listeners = new Set<(s: DashboardState) => void>();
  const emit = () => listeners.forEach(cb => cb(state));

  return {
    getState: () => state,
    update(neckPitch: number, thorPitch: number, lumbarRoll: number) {
      const {posture} = classifyAndAction(neckPitch, thorPitch, lumbarRoll);
      totalSamples += 1;
      if (posture === 'NORMAL') {
        healthySamples += 1;
      }
      const score = totalSamples > 0 ? Math.round((healthySamples * 100) / totalSamples) : 100;
      const next: KinematicsState = {
        neckPitch,
        thorPitch,
        lumbarRoll,
        posture,
        postureLabel: POSTURE_LABELS[posture],
        score,
        abnormalDurationMinutes: posture !== 'NORMAL' ? 1 : 0,
      };
      // 建议粘性：姿态类别变化（或首次）→ 重算规则文案并清掉模型态；否则保留当前文案（含模型流式结果）
      const postureChanged = posture !== state.posture || state.advice === '';
      if (postureChanged) {
        const feedback = ruleFallback(signalsFrom(next));
        state = {...next, advice: feedback.advice, inferenceSource: 'RULE_FALLBACK', streaming: false};
      } else {
        state = {...next, advice: state.advice, inferenceSource: state.inferenceSource, streaming: state.streaming};
      }
      emit();
    },
    setOffline() {
      const feedback = ruleFallback(signalsFrom({...state, posture: 'OFFLINE'}));
      state = {
        ...state,
        posture: 'OFFLINE',
        postureLabel: POSTURE_LABELS.OFFLINE,
        advice: feedback.advice,
        inferenceSource: 'RULE_FALLBACK',
        streaming: false,
      };
      emit();
    },
    setModelAdvice(advice: string, opts: {streaming: boolean}) {
      state = {...state, advice, inferenceSource: 'MODEL', streaming: opts.streaming};
      emit();
    },
    subscribe(cb) {
      listeners.add(cb);
      cb(state);
      return () => listeners.delete(cb);
    },
  };
}
