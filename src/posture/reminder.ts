/**
 * @file reminder.ts
 * @description 异常坐姿提醒：订阅 PostureEngine，姿态从「非异常 → 异常」时触发设备震动。
 *   用 RN 内置 `Vibration`（零新依赖）；带冷却避免抖动时频繁震动。卡片/文案由 Desk 渲染，这里只补"震动"那一下。
 *   web(RNW) 上 Vibration 多为 no-op，已 try/catch。
 *
 * [WHO] 导出 `Reminder`、`createReminder(engine, opts?)`
 * [FROM] 依赖 `react-native`(Vibration)、./engine(PostureEngine)、./types(PostureName)
 * [TO] 被 App.tsx 启动
 * [HERE] src/posture/reminder.ts · 异常坐姿震动提醒
 */
import {Vibration} from 'react-native';
import {PostureEngine} from './engine';
import {PostureName} from './types';

const ABNORMAL: PostureName[] = ['SLUMPED', 'TECH_NECK', 'LEFT_LEAN'];
/** 两次震动最小间隔，避免姿态抖动反复触发。 */
const COOLDOWN_MS = 8000;
/** 温和双段震动（Android 按 pattern；iOS 忽略 pattern 走固定时长）。 */
const PATTERN = [0, 220, 120, 220];

export type Reminder = {start: () => void; stop: () => void};

export function createReminder(engine: PostureEngine, opts: {cooldownMs?: number} = {}): Reminder {
  const cooldownMs = opts.cooldownMs ?? COOLDOWN_MS;
  let last: PostureName | null = null;
  let lastBuzzTs = 0;
  let unsub: (() => void) | null = null;

  return {
    start() {
      if (unsub) {
        return;
      }
      unsub = engine.subscribe(s => {
        if (s.posture === last) {
          return;
        }
        const wasAbnormal = last != null && ABNORMAL.includes(last);
        const isAbnormal = ABNORMAL.includes(s.posture);
        last = s.posture;
        // 仅「非异常 → 异常」的入态那一下震动，且过冷却
        if (isAbnormal && !wasAbnormal && Date.now() - lastBuzzTs >= cooldownMs) {
          lastBuzzTs = Date.now();
          try {
            Vibration.vibrate(PATTERN);
          } catch {
            // web/无震动硬件：忽略
          }
        }
      });
    },
    stop() {
      unsub?.();
      unsub = null;
    },
  };
}
