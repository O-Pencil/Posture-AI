/**
 * @file bleSensorSource.ts
 * @description 硬件数据源：通过 BLE 连接 ESP32-S3 + BNO085 姿态带，订阅 notify 特征，解析四元数 → 颈/胸/腰角度，喂 engine.update。
 *   与 sensorSource(手机 IMU)/mock 并列；连接成功后取代手机 IMU。BLE UUID 与固件必须一致。
 *   纪律：1 节点（胸 Node-T）时，该节点 pitch→胸、roll→腰；3 节点时各算。校准记基线四元数，角度相对基线。
 *   依赖 react-native-ble-plx（原生，需 dev build）；用 require 懒加载，RNW/缺库时 start() 返回 false 不崩。
 *
 * [WHO] 导出 `BleStatus`/`BleSensorSource`/`CATUNE_BLE`/`createBleSensorSource`
 * [FROM] 依赖 `react-native`(PermissionsAndroid/Platform)、`react-native-ble-plx`(懒加载)、./engine(PostureEngine 类型)
 * [TO] 被 App.tsx 作为第三数据源启动
 * [HERE] src/posture/bleSensorSource.ts · BLE 硬件姿态数据源
 */
import {PermissionsAndroid, Platform} from 'react-native';
import type {PostureEngine} from '../posture/engine';
import {inferNeckFromThor} from '../posture/spineKinematics';

/** BLE 协议常量（App 与 ESP32 固件必须一致）。 */
export const CATUNE_BLE = {
  service: '6e401000-b5a3-f393-e0a9-e50e24dcca9e',
  characteristic: '6e401001-b5a3-f393-e0a9-e50e24dcca9e',
  namePrefix: 'Catune',
};

export type BleStatus = 'idle' | 'scanning' | 'connecting' | 'connected' | 'error';

export type BleSensorSource = {
  /** 申请权限→扫描→连接→订阅；连上返回 true，失败/超时 false。 */
  start: () => Promise<boolean>;
  stop: () => void;
  /** 把当前姿态设为基线（坐直时点一次）。 */
  calibrate: () => void;
  getStatus: () => BleStatus;
  onStatus: (cb: (s: BleStatus, info?: string) => void) => void;
};

// react-native-ble-plx 懒加载（原生才有；RNW/缺库时为 null）
let BleManagerCtor: (new () => any) | null = null;
try {
  BleManagerCtor = require('react-native-ble-plx').BleManager;
} catch {
  BleManagerCtor = null;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** base64(ble-plx 的 characteristic.value) → 字节，无第三方依赖。 */
function base64ToBytes(b64: string): Uint8Array {
  /* eslint-disable no-bitwise */
  const s = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor((s.length * 3) / 4);
  const out = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < s.length; i += 4) {
    const a = B64.indexOf(s[i]);
    const b = B64.indexOf(s[i + 1]);
    const c = B64.indexOf(s[i + 2]);
    const d = B64.indexOf(s[i + 3]);
    const n = (a << 18) | (b << 12) | ((c & 63) << 6) | (d & 63);
    if (p < len) out[p++] = (n >> 16) & 255;
    if (c !== -1 && p < len) out[p++] = (n >> 8) & 255;
    if (d !== -1 && p < len) out[p++] = n & 255;
  }
  /* eslint-enable no-bitwise */
  return out;
}

const RAD2DEG = 180 / Math.PI;
/** 四元数(w,x,y,z) → 前后俯仰 pitch / 左右翻滚 roll（度）。 */
function quatToPitchRoll(w: number, x: number, y: number, z: number): {pitch: number; roll: number} {
  const roll = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)) * RAD2DEG;
  let sinp = 2 * (w * y - z * x);
  sinp = Math.max(-1, Math.min(1, sinp));
  const pitch = Math.asin(sinp) * RAD2DEG;
  return {pitch, roll};
}

async function requestAndroidPerms(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    const api = Platform.Version as number;
    const perms =
      api >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const res = await PermissionsAndroid.requestMultiple(perms);
    return Object.values(res).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
  } catch {
    return false;
  }
}

export function createBleSensorSource(engine: PostureEngine): BleSensorSource {
  let manager: any = null;
  let device: any = null;
  let sub: {remove: () => void} | null = null;
  let status: BleStatus = 'idle';
  let statusCb: ((s: BleStatus, info?: string) => void) | null = null;

  const latest = {neck: 0, thor: 0, lumbar: 0};
  const baseline: Record<number, {pitch: number; roll: number}> = {};
  const lastRaw: Record<number, {pitch: number; roll: number}> = {};

  const setStatus = (s: BleStatus, info?: string) => {
    status = s;
    statusCb?.(s, info);
  };

  const handlePacket = (bytes: Uint8Array) => {
    if (bytes.length < 17) {
      return;
    }
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const nodeId = dv.getUint8(0);
    const w = dv.getFloat32(1, true);
    const x = dv.getFloat32(5, true);
    const y = dv.getFloat32(9, true);
    const z = dv.getFloat32(13, true);
    const {pitch, roll} = quatToPitchRoll(w, x, y, z);
    lastRaw[nodeId] = {pitch, roll};
    const b = baseline[nodeId] ?? {pitch: 0, roll: 0};
    const relP = pitch - b.pitch;
    const relR = roll - b.roll;
    if (nodeId === 0) {
      latest.neck = relP; // 颈 C7
    } else if (nodeId === 1) {
      latest.thor = relP; // 胸 T12（单节点时也用其 roll 当腰）
      latest.lumbar = relR;
    } else if (nodeId === 2) {
      latest.lumbar = relR; // 腰 L5（覆盖单节点估计）
    }
    if (!(0 in lastRaw)) {
      latest.neck = inferNeckFromThor(latest.thor);
    }
    engine.update(latest.neck, latest.thor, latest.lumbar);
  };

  return {
    getStatus: () => status,
    onStatus(cb) {
      statusCb = cb;
    },
    calibrate() {
      Object.keys(lastRaw).forEach(k => {
        baseline[Number(k)] = {...lastRaw[Number(k)]};
      });
      latest.neck = 0;
      latest.thor = 0;
      latest.lumbar = 0;
    },
    async start() {
      if (!BleManagerCtor) {
        setStatus('error', 'BLE 不可用（需原生构建 / 非 web）');
        return false;
      }
      if (!(await requestAndroidPerms())) {
        setStatus('error', '蓝牙权限被拒');
        return false;
      }
      manager = new BleManagerCtor();
      return new Promise<boolean>(resolve => {
        let settled = false;
        const timeout = setTimeout(() => {
          if (!settled) {
            settled = true;
            try {
              manager?.stopDeviceScan();
            } catch {}
            setStatus('error', '未找到设备');
            resolve(false);
          }
        }, 12000);
        setStatus('scanning');
        manager.startDeviceScan([CATUNE_BLE.service], null, async (err: any, dev: any) => {
          if (err) {
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              setStatus('error', err.message ?? 'scan error');
              resolve(false);
            }
            return;
          }
          if (!dev) {
            return;
          }
          try {
            manager.stopDeviceScan();
            setStatus('connecting', dev.name ?? dev.id);
            device = await dev.connect();
            await device.discoverAllServicesAndCharacteristics();
            sub = device.monitorCharacteristicForService(
              CATUNE_BLE.service,
              CATUNE_BLE.characteristic,
              (e: any, c: any) => {
                if (e || !c?.value) {
                  return;
                }
                handlePacket(base64ToBytes(c.value));
              },
            );
            device.onDisconnected(() => setStatus('idle', '已断开'));
            clearTimeout(timeout);
            settled = true;
            setStatus('connected', dev.name ?? dev.id);
            resolve(true);
          } catch (e: any) {
            clearTimeout(timeout);
            settled = true;
            setStatus('error', e?.message ?? 'connect failed');
            resolve(false);
          }
        });
      });
    },
    stop() {
      try {
        sub?.remove();
      } catch {}
      try {
        device?.cancelConnection();
      } catch {}
      try {
        manager?.stopDeviceScan();
      } catch {}
      try {
        manager?.destroy();
      } catch {}
      sub = null;
      device = null;
      manager = null;
      setStatus('idle');
    },
  };
}
