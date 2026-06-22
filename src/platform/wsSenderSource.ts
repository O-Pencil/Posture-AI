/**
 * @file wsSenderSource.ts
 * @description WS 发送方：本机 DeviceMotion → JSON {nodeId,pitch,roll} 推到 Mac 中转，
 *   同时用 orientationToNodes 喂本地 engine（发送端 Desk 也能看到指标变化）。
 */
import {DeviceMotion} from 'expo-sensors';
import type {PostureEngine} from '../posture/engine';
import {orientationToNodes} from '../posture/postureMapping';
import {loadWsConfig} from './wsConfig';
import {readDevicePitchRoll} from './deviceMotionReader';
import type {WsStatus} from './wsSensorSource';

const NODE_ID = 1;
const SEND_INTERVAL_MS = 33;

export type WsSenderSource = {
  start: () => Promise<boolean>;
  stop: () => void;
  getStatus: () => WsStatus;
  onStatus: (cb: (s: WsStatus, info?: string) => void) => void;
  getLastAngles: () => {pitch: number; roll: number};
};

function readPitchRoll(data: DeviceMotion.DeviceMotionMeasurement): {pitch: number; roll: number} | null {
  return readDevicePitchRoll(data);
}

export function createWsSenderSource(engine: PostureEngine): WsSenderSource {
  let ws: WebSocket | null = null;
  let sub: {remove: () => void} | null = null;
  let status: WsStatus = 'idle';
  let statusCb: ((s: WsStatus, info?: string) => void) | null = null;
  let lastSend = 0;
  let pitch = 0;
  let roll = 0;

  const setStatus = (s: WsStatus, info?: string) => {
    status = s;
    statusCb?.(s, info);
  };

  const sendFrame = () => {
    if (!ws || ws.readyState !== 1) {
      return;
    }
    const now = Date.now();
    if (now - lastSend < SEND_INTERVAL_MS) {
      return;
    }
    lastSend = now;
    ws.send(JSON.stringify({nodeId: NODE_ID, pitch, roll}));
  };

  const bindMotion = () => {
    sub?.remove();
    sub = null;
    DeviceMotion.setUpdateInterval(SEND_INTERVAL_MS);
    sub = DeviceMotion.addListener(data => {
      const angles = readPitchRoll(data);
      if (!angles) {
        return;
      }
      pitch = angles.pitch;
      roll = angles.roll;
      // 发送原始 pitch/roll；本地也用统一几何(竖直=挺直、前倾=驼背)喂引擎，与接收端一致
      const spine = orientationToNodes(pitch, roll);
      engine.update(spine.neck, spine.thor, spine.lumbar);
      sendFrame();
    });
  };

  return {
    getStatus: () => status,
    getLastAngles: () => ({pitch, roll}),
    onStatus(cb) {
      statusCb = cb;
    },
    async start() {
      const cfg = await loadWsConfig();
      try {
        const available = await DeviceMotion.isAvailableAsync();
        if (!available) {
          setStatus('error', '本机无运动传感器');
          return false;
        }
        const perm = await DeviceMotion.requestPermissionsAsync();
        if (perm.status !== 'granted') {
          setStatus('error', '未授权运动传感器');
          return false;
        }
      } catch (e: any) {
        setStatus('error', e?.message ?? '传感器初始化失败');
        return false;
      }

      return new Promise<boolean>(resolve => {
        let settled = false;
        try {
          setStatus('connecting', cfg.url);
          ws = new WebSocket(cfg.url);
        } catch (e: any) {
          setStatus('error', e?.message ?? 'WS 创建失败');
          resolve(false);
          return;
        }

        const timeout = setTimeout(() => {
          if (!settled) {
            settled = true;
            setStatus('error', '连接超时');
            try {
              ws?.close();
            } catch {}
            resolve(false);
          }
        }, 8000);

        ws.onopen = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            DeviceMotion.setUpdateInterval(SEND_INTERVAL_MS);
            bindMotion();
            setStatus('connected', cfg.url);
            sendFrame();
            resolve(true);
          }
        };
        ws.onerror = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            setStatus('error', 'WS 连接错误');
            resolve(false);
          }
        };
        ws.onclose = () => {
          if (settled) {
            setStatus('idle', '已断开');
          }
        };
      });
    },
    stop() {
      sub?.remove();
      sub = null;
      try {
        ws?.close();
      } catch {}
      ws = null;
      setStatus('idle');
    },
  };
}
