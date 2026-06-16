/**
 * @file adviceOrchestrator.ts
 * @description 建议文案编排：订阅引擎，姿态类别变化 / 同一异常姿态久持 时，异步后台调端侧模型生成「有温度」的提醒，流式写回引擎；规则文案先兜底。
 *   仪表盘永远走规则瞬时显示，绝不等模型；模型只替换建议文案。失败保留规则文案。
 *
 * [WHO] 导出 `createAdviceOrchestrator(engine): {start, stop}`
 * [FROM] 依赖 ./engine、./types、../mnn/inferStreamClient
 * [TO] 被 App.tsx 启动（不碰 UI）
 * [HERE] src/posture/adviceOrchestrator.ts · 模型建议异步编排
 */
import {PostureEngine} from './engine';
import {DashboardState, PostureName} from './types';
import {isModelAvailable, streamInfer} from '../mnn/inferStreamClient';

const MIN_INTERVAL_MS = 12000; // 两次模型调用最小间隔（生成慢，避免堆积）
const HOLD_REPEAT_MS = 120000; // 同一异常姿态久持 → 每 2 分钟再鼓励一次
const ABNORMAL: PostureName[] = ['SLUMPED', 'TECH_NECK', 'LEFT_LEAN'];

const POSTURE_DESC: Record<PostureName, string> = {
  SLUMPED: '含胸驼背',
  TECH_NECK: '头部前倾',
  LEFT_LEAN: '身体侧偏',
  NORMAL: '坐姿端正',
  OFFLINE: '未连接',
};

function buildPrompt(s: DashboardState): string {
  return [
    '你是温柔贴心的坐姿教练。',
    `用户现在${POSTURE_DESC[s.posture]}（颈${s.neckPitch.toFixed(0)}° 胸${s.thorPitch.toFixed(0)}° 腰${s.lumbarRoll.toFixed(0)}°）。`,
    '用一句有温度、口语化、不超过30字的中文提醒他调整坐姿，可带一点鼓励或调侃；',
    '不要医疗诊断、不要夸张承诺。只输出这一句话，不要解释。',
  ].join('');
}

export type AdviceOrchestrator = {start: () => void; stop: () => void};

export function createAdviceOrchestrator(engine: PostureEngine): AdviceOrchestrator {
  let lastPosture: PostureName | null = null;
  let lastTriggerTs = 0;
  let inFlight = false;
  let cancel: (() => void) | null = null;
  let tick: ReturnType<typeof setInterval> | null = null;
  let unsub: (() => void) | null = null;

  const trigger = (s: DashboardState) => {
    if (inFlight || !isModelAvailable()) {
      return;
    }
    if (!ABNORMAL.includes(s.posture)) {
      return; // 只在异常姿态时让模型生成提醒；正常态用规则鼓励即可
    }
    if (Date.now() - lastTriggerTs < MIN_INTERVAL_MS) {
      return;
    }
    inFlight = true;
    lastTriggerTs = Date.now();
    let acc = '';
    cancel = streamInfer(buildPrompt(s), {
      onToken: chunk => {
        acc += chunk;
        engine.setModelAdvice(acc.trim(), {streaming: true});
      },
      onDone: () => {
        if (acc.trim()) {
          engine.setModelAdvice(acc.trim(), {streaming: false});
        }
        inFlight = false;
        cancel = null;
      },
      onError: () => {
        // 失败：保留引擎里已有的规则文案，不动
        inFlight = false;
        cancel = null;
      },
    });
  };

  return {
    start() {
      unsub = engine.subscribe(s => {
        if (s.posture !== lastPosture) {
          lastPosture = s.posture;
          // 姿态变了：取消旧姿态的生成（旧文案已无意义），再按新姿态触发
          cancel?.();
          cancel = null;
          inFlight = false;
          trigger(s);
        }
      });
      // 久持同一异常姿态 → 周期再触发（再鼓励一次）
      tick = setInterval(() => {
        const s = engine.getState();
        if (ABNORMAL.includes(s.posture) && Date.now() - lastTriggerTs >= HOLD_REPEAT_MS) {
          trigger(s);
        }
      }, 15000);
    },
    stop() {
      unsub?.();
      unsub = null;
      cancel?.();
      cancel = null;
      inFlight = false;
      if (tick) {
        clearInterval(tick);
        tick = null;
      }
    },
  };
}
