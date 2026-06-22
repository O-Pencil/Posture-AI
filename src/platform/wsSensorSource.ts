/**
 * @file wsSensorSource.ts
 * @description 保底数据源：通过 WebSocket 接收「另一台手机(浏览器)」发来的姿态角（JSON {nodeId,pitch,roll}），
 *   按映射喂 engine.update。ESP32 没烧通时用——一台手机贴背当姿态带，另一台跑 App。详见 scripts/ws-relay/README.md。
 *   与 sensorSource(手机 IMU)/ble(硬件)/mock 并列；连上后取代手机 IMU。映射默认 node-T(背)：pitch→胸、roll→腰、颈由胸推算。
 *
 * [WHO] 导出 `WsStatus`/`WsSensorSource`/`createWsSensorSource`
 * [FROM] 依赖 全局 `WebSocket`(RN 内置)、./wsConfig(地址/映射)、../posture/engine(PostureEngine 类型)
 * [TO] 被 App.tsx 作为第四数据源启动
 * [HERE] src/platform/wsSensorSource.ts · WS 手机姿态带保底数据源
 */
import type {PostureEngine} from '../posture/engine';
import {orientationToNodes, UPRIGHT_PITCH_DEG} from '../posture/postureMapping';
import {loadWsConfig, WsMapping} from './wsConfig';

export type WsStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type WsSensorSource = {
  /** 读配置 → 连 WS；连上返回 true，失败/超时 false。 */
  start: () => Promise<boolean>;
  stop: () => void;
  /** 把当前姿态设为基线（坐直时点一次）。 */
  calibrate: () => void;
  getStatus: () => WsStatus;
  onStatus: (cb: (s: WsStatus, info?: string) => void) => void;
};

export function createWsSensorSource(engine: PostureEngine): WsSensorSource {
  let ws: WebSocket | null = null;
  let status: WsStatus = 'idle';
  let statusCb: ((s: WsStatus, info?: string) => void) | null = null;
  let mapping: WsMapping = 'node-T';

  // 基线默认竖直挺直（pitch≈90°）→ 校准前平放也能正确判坏；「坐直校准」会覆盖成实测值
  const baseline = {pitch: UPRIGHT_PITCH_DEG, roll: 0};
  const lastRaw = {pitch: UPRIGHT_PITCH_DEG, roll: 0};

  const setStatus = (s: WsStatus, info?: string) => {
    status = s;
    statusCb?.(s, info);
  };

  const handle = (raw: string) => {
    let d: {nodeId?: number; pitch?: number; roll?: number};
    try {
      d = JSON.parse(raw);
    } catch {
      return;
    }
    if (typeof d.pitch !== 'number' || typeof d.roll !== 'number') {
      return;
    }
    lastRaw.pitch = d.pitch;
    lastRaw.roll = d.roll;
    // 统一几何：竖直=挺直、前倾=驼背/低头、平放=坏（见 postureMapping）
    const {neck, thor, lumbar} = orientationToNodes(d.pitch, d.roll, baseline.pitch, baseline.roll);
    // node-T：单点(背) → 颈不动（背部传感器测不到头）、胸=驼背、腰=侧倾
    // 3-axis：一台手机演三态 → 同一前倾量也给颈（低头）
    if (mapping === '3-axis') {
      engine.update(neck, thor, lumbar);
    } else {
      engine.update(0, thor, lumbar);
    }
  };

  return {
    getStatus: () => status,
    onStatus(cb) {
      statusCb = cb;
    },
    calibrate() {
      baseline.pitch = lastRaw.pitch;
      baseline.roll = lastRaw.roll;
    },
    async start() {
      const cfg = await loadWsConfig();
      mapping = cfg.mapping;
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
            setStatus('connected', cfg.url);
            resolve(true);
          }
        };
        ws.onmessage = e => handle(typeof e.data === 'string' ? e.data : String(e.data));
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
      try {
        ws?.close();
      } catch {}
      ws = null;
      setStatus('idle');
    },
  };
}
