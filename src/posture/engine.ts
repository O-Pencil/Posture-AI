/**
 * @file engine.ts
 * @description 跨平台姿态引擎（TS）：3 节点规则状态机（颈/胸/腰）+ 0-100 打分 + 本地查表文案 + 禁词检查 + 规则兜底。
 *   从 Kotlin 侧迁移，iOS/Android 通用，无原生依赖。
 *
 * [WHO] 导出 `createPostureEngine()`、`ruleFallback()`、`THRESHOLDS`、`sanitize()`、`getBannedWords()`
 * [FROM] 依赖 ./types、./actionTag、../design/i18n(tr, getDict)
 * [TO] 被 mock.ts/sensorSource.ts 写入、adviceOrchestrator 推模型文案、Dashboard/App 订阅
 * [HERE] src/posture/engine.ts · 姿态规则引擎（TS）
 *
 * 节点（PRD 3 节点）：neckPitch=颈椎前倾、thorPitch=胸椎后凸(驼背主指标)、lumbarRoll=腰椎侧倾。
 * 纪律（PRD §5.10）：分类/打分用规则（可靠底线）；端侧模型只补「文案生成」；文案一律过禁词。
 * 建议文案「粘性」：规则文案只在姿态类别变化时重算；模型文案经 setModelAdvice 异步替换，不被 10Hz 帧覆盖。
 */
import {getDict, tr, type Locale} from '../design/i18n';
import {actionForPosture, parseActionTag} from './actionTag';
import {
  DashboardState,
  KinematicsState,
  PostureFeedback,
  PostureName,
  PostureSignals,
  getPostureLabel,
} from './types';
import {logEvent} from '../debug/logBus';

let lastSensorLogTs = 0;

/** 与 PRD 阈值一致：胸椎后凸>15°=驼背；颈前倾>20°；腰椎侧倾<-10°。 */
export const THRESHOLDS = {
  neckTechDeg: 20,
  thorSlumpDeg: 15,
  lumbarLeanDeg: -10,
};

/** 行为常量：评分/严重度/节流，与 PRD 风险等级一致。 */
// 异常姿态持续多久开始影响打分（分钟）。
const DURATION_FOR_BUMP_MIN = 45;
// 严重度等级阈值（超出阈值多少度 = level 1/2/3）。
const SEVERITY_EXCESS_MINOR = 10;
const SEVERITY_EXCESS_MAJOR = 20;
// 传感器演示日志节流：1Hz（10Hz 数据流节流到演示日志 1Hz）。
const SENSOR_LOG_THROTTLE_MS = 1000;

// ---------------- 安全链：本地查表文案 + 禁词 ----------------

/** locale 感知的禁词（诊断 / 治疗 / 承诺 / 营销）。model 输出也按 locale 检查。 */
const BANNED_WORDS: Record<Locale, string[]> = {
  en: [
    'diagnosed', 'diagnosis', 'patient with', 'syndrome',
    'treatment', 'cure', 'medication', 'surgery', 'injection', 'patch',
    'guarantee', 'guaranteed', 'definitely', '100%', 'completely', 'forever',
    'limited time', 'discount', 'buy now', 'scan code',
  ],
  zh: [
    '确诊', '诊断为', '患有', '综合征',
    '治疗', '治愈', '药物', '手术', '注射', '贴片',
    '保证', '一定', '100%', '彻底', '永远',
    '限时', '优惠', '推荐购买', '扫码',
  ],
};

export function getBannedWords(locale: Locale): string[] {
  return BANNED_WORDS[locale] ?? BANNED_WORDS.en;
}

function isSafe(text: string, locale: Locale): boolean {
  return !getBannedWords(locale).some(w => text.includes(w));
}

/** 命中禁词则整体替换为中性兜底文案。 */
export function sanitize(text: string, locale: Locale = 'en'): string {
  return isSafe(text, locale) ? text : tr(locale, 'advice.fallback');
}

function adviceFor(actionId: string | null, severityLevel: number, posture: PostureName, locale: Locale): string {
  let base: string;
  if (actionId) {
    const key = `advice.action.${actionId}`;
    const v = tr(locale, key);
    base = v === key ? tr(locale, 'advice.fallback') : v;
  } else if (posture === 'NORMAL') {
    base = tr(locale, 'advice.normal');
  } else {
    base = tr(locale, 'advice.fallback');
  }
  const text = severityLevel >= 3 ? `${base} ${tr(locale, 'advice.severitySuffix')}` : base;
  return sanitize(text, locale);
}

// ---------------- 3 节点分类（规则） ----------------

/** 单一判定来源：3 节点角度 → 姿态 + 推荐动作。
 *  前倾(俯仰轴：驼背/低头)与侧倾(翻滚轴：弯腰)是两个独立轴；各算"超阈值比例"，取比例最大者展示
 *  —— 与人体一致：最明显的那个偏差最先被注意。侧倾对称（左右都算）。比例相同优先驼背(PRD 主指标)。 */
function classifyAndAction(
  neck: number,
  thor: number,
  lumbar: number,
): {posture: PostureName; actionId: string | null} {
  const candidates: Array<{posture: PostureName; actionId: string; ratio: number}> = [
    {posture: 'SLUMPED', actionId: 'thoracic_extension', ratio: thor / THRESHOLDS.thorSlumpDeg},
    {posture: 'LEFT_LEAN', actionId: 'scapular_retraction', ratio: Math.abs(lumbar) / Math.abs(THRESHOLDS.lumbarLeanDeg)},
    {posture: 'TECH_NECK', actionId: 'neck_retraction', ratio: neck / THRESHOLDS.neckTechDeg},
  ];
  let best: {posture: PostureName; actionId: string; ratio: number} | null = null;
  for (const c of candidates) {
    if (c.ratio >= 1 && (best === null || c.ratio > best.ratio)) {
      best = c;
    }
  }
  return best ? {posture: best.posture, actionId: best.actionId} : {posture: 'NORMAL', actionId: null};
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
  const base = excess >= SEVERITY_EXCESS_MAJOR ? 3 : excess >= SEVERITY_EXCESS_MINOR ? 2 : 1;
  return s.durationMin >= DURATION_FOR_BUMP_MIN ? Math.min(3, base + 1) : base;
}

/** 纯规则兜底：复用阈值，离线 100% 可用。 */
export function ruleFallback(signals: PostureSignals, locale: Locale = 'en'): PostureFeedback {
  const {posture, actionId} = classifyAndAction(
    signals.neckPitchDeg,
    signals.thorPitchDeg,
    signals.lumbarRollDeg,
  );
  const severity = severityOf(posture, signals);
  return {advice: adviceFor(actionId, severity, posture, locale), source: 'RULE_FALLBACK'};
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
  /** 切换 locale：重渲 postureLabel + 规则文案（仅在姿态变化时会触发新一轮）。 */
  setLocale: (locale: Locale) => void;
  subscribe: (cb: (s: DashboardState) => void) => () => void;
};

export type EngineOptions = {
  /** 当前 locale getter：engine 在生成 advice / postureLabel 时按 locale 查表。 */
  getLocale?: () => Locale;
};

/**
 * 单例式状态枢纽（等价 Kotlin 的 KinematicsHub StateFlow）。
 * update 每帧算分类/分数；建议文案「粘性」：规则只在姿态变化时重算，模型文案由 setModelAdvice 异步替换。
 */
export function createPostureEngine(opts: EngineOptions = {}): PostureEngine {
  const getLocale = opts.getLocale ?? ((): Locale => 'en');

  let totalSamples = 0;
  let healthySamples = 0;
  let state: DashboardState = {
    neckPitch: 0,
    thorPitch: 0,
    lumbarRoll: 0,
    posture: 'NORMAL',
    postureLabel: getPostureLabel('NORMAL', getLocale()),
    score: 100,
    abnormalDurationMinutes: 0,
    advice: '',
    inferenceSource: 'RULE_FALLBACK',
    streaming: false,
    action: null,
  };
  const listeners = new Set<(s: DashboardState) => void>();
  const emit = () => listeners.forEach(cb => cb(state));

  return {
    getState: () => state,
    update(neckPitch: number, thorPitch: number, lumbarRoll: number) {
      const locale = getLocale();
      const {posture} = classifyAndAction(neckPitch, thorPitch, lumbarRoll);
      // 演示日志：传感器输入（10Hz → 节流 1Hz）
      const nowTs = Date.now();
      if (nowTs - lastSensorLogTs > SENSOR_LOG_THROTTLE_MS) {
        lastSensorLogTs = nowTs;
        logEvent('sensor', `输入 颈${neckPitch.toFixed(0)}° 胸${thorPitch.toFixed(0)}° 腰${lumbarRoll.toFixed(0)}°`);
      }
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
        postureLabel: getPostureLabel(posture, locale),
        score,
        abnormalDurationMinutes: posture !== 'NORMAL' ? 1 : 0,
      };
      // 建议粘性：姿态类别变化（或首次）→ 重算规则文案并清掉模型态；否则保留当前文案（含模型流式结果）
      const postureChanged = posture !== state.posture || state.advice === '';
      if (postureChanged) {
        if (posture !== state.posture) {
          logEvent('flow', `姿态 → ${getPostureLabel(posture, locale)}（不驼背分 ${score}）`);
        }
        const feedback = ruleFallback(signalsFrom(next), locale);
        state = {
          ...next,
          advice: feedback.advice,
          inferenceSource: 'RULE_FALLBACK',
          streaming: false,
          action: actionForPosture(posture),
        };
      } else {
        state = {
          ...next,
          advice: state.advice,
          inferenceSource: state.inferenceSource,
          streaming: state.streaming,
          action: state.action,
        };
      }
      emit();
    },
    setOffline() {
      const locale = getLocale();
      const feedback = ruleFallback(signalsFrom({...state, posture: 'OFFLINE'}), locale);
      state = {
        ...state,
        posture: 'OFFLINE',
        postureLabel: getPostureLabel('OFFLINE', locale),
        advice: feedback.advice,
        inferenceSource: 'RULE_FALLBACK',
        streaming: false,
        action: null,
      };
      emit();
    },
    setModelAdvice(advice: string, modelOptions: {streaming: boolean}) {
      // 解析尾部 [动作:xxx]：正文给用户看，动作驱动点位高亮；流式未出标签时保留按姿态推导的动作
      const {text, action} = parseActionTag(advice, getLocale());
      state = {
        ...state,
        advice: sanitize(text, getLocale()),
        action: action ?? state.action,
        inferenceSource: 'MODEL',
        streaming: modelOptions.streaming,
      };
      emit();
    },
    setLocale(_locale: Locale) {
      // 强制按当前 locale 重渲 postureLabel，并重算规则文案（若有）
      const locale = getLocale();
      const newPostureLabel = getPostureLabel(state.posture, locale);
      // 若当前 advice 是规则生成的，按 locale 重出
      const isRule = state.inferenceSource === 'RULE_FALLBACK';
      const newAdvice = isRule
        ? ruleFallback(signalsFrom(state), locale).advice
        : state.advice;
      state = {
        ...state,
        postureLabel: newPostureLabel,
        advice: newAdvice,
      };
      emit();
    },
    subscribe(cb) {
      listeners.add(cb);
      cb(state);
      return () => listeners.delete(cb);
    },
  };
}

/** 已废弃的常量占位（避免导入报错）。真正的兜底文案走 i18n。 */
export const SAFE_FALLBACK = '';

// Re-export for callers that want a typed `Locale` import.
export type {Locale} from '../design/i18n';

// getDict re-export for assess/service that wants to enumerate keys.
export {getDict};
