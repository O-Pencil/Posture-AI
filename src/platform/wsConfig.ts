/**
 * @file wsConfig.ts
 * @description WS 手机姿态带（保底方案）的本地配置持久化：中转地址 url + 映射模式 mapping。
 *   documentDirectory/catune_ws/config.json，仅存本机。详见 scripts/ws-relay/README.md。
 *
 * [WHO] 导出 `WsMapping`/`WsConfig`/`DEFAULT_WS_CONFIG`/`loadWsConfig`/`saveWsConfig`
 * [FROM] 依赖 `expo-file-system/legacy`
 * [TO] 被 src/platform/wsSensorSource.ts 与 Settings「手机姿态带(WS)」卡片消费
 * [HERE] src/platform/wsConfig.ts · WS 保底数据源配置持久化
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Device from 'expo-device';
import {Platform} from 'react-native';

/** node-T：单点(背)，pitch→胸/roll→腰；3-axis：一台手机演三态，pitch→颈+胸/roll→腰。 */
export type WsMapping = 'node-T' | '3-axis';

export type WsConfig = {
  /** 中转地址，例：ws://192.168.1.100:8787（server 启动时打印）。 */
  url: string;
  mapping: WsMapping;
};

/** Web→127.0.0.1；安卓模拟器→10.0.2.2；真机→Settings 填 Mac 内网 IP。 */
export function defaultWsUrl(): string {
  try {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
      return `ws://${host}:8787`;
    }
  } catch {
    // native
  }
  if (Platform.OS === 'android' && Device.isDevice === false) {
    return 'ws://10.0.2.2:8787';
  }
  return 'ws://192.168.1.100:8787';
}

export const DEFAULT_WS_CONFIG: WsConfig = {
  url: defaultWsUrl(),
  mapping: 'node-T',
};

const DIR = (FileSystem.documentDirectory ?? '') + 'catune_ws/';
const FILE = DIR + 'config.json';

export async function loadWsConfig(): Promise<WsConfig> {
  try {
    const info = await FileSystem.getInfoAsync(FILE);
    if (!info.exists) {
      return DEFAULT_WS_CONFIG;
    }
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(FILE));
    return {
      url: typeof parsed?.url === 'string' && parsed.url ? parsed.url : DEFAULT_WS_CONFIG.url,
      mapping: parsed?.mapping === '3-axis' ? '3-axis' : 'node-T',
    };
  } catch {
    return DEFAULT_WS_CONFIG;
  }
}

export async function saveWsConfig(config: WsConfig): Promise<void> {
  try {
    await FileSystem.makeDirectoryAsync(DIR, {intermediates: true});
    await FileSystem.writeAsStringAsync(FILE, JSON.stringify(config));
  } catch {
    // web / 无 FS：忽略
  }
}
