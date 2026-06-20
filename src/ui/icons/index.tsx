/**
 * @file icons.tsx
 * @description 正式 SVG 图标集（react-native-svg，lucide 风格描边）。替代 emoji，三端(iOS/Android/Web)通用。
 *
 * [WHO] 导出 `IconProps` 与 `GaugeIcon`/`FanIcon`/`SettingsIcon`/`DeviceIcon`/`SunIcon`/`BatteryIcon`
 * [FROM] 依赖 `react`、`react-native-svg`
 * [TO] 被 TabBar / DeviceStatus / PlantScreen 等消费
 * [HERE] src/ui/icons/index.tsx · 图标集
 */
import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';

export type IconProps = {size?: number; color?: string; strokeWidth?: number};

const stroke = (p: IconProps) => ({
  stroke: p.color ?? '#141414',
  strokeWidth: p.strokeWidth ?? 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

/** 仪表盘（Desk 标签）。 */
export function GaugeIcon(p: IconProps): React.JSX.Element {
  const s = p.size ?? 24;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M3.34 19a10 10 0 1 1 17.32 0" {...stroke(p)} />
      <Path d="m12 14 4-4" {...stroke(p)} />
    </Svg>
  );
}

/** 活动 / 监控（Monitor 标签，lucide activity）。 */
export function MonitorIcon(p: IconProps): React.JSX.Element {
  const s = p.size ?? 24;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M22 12h-4l-3 9L9 3l-3 9H2" {...stroke(p)} />
    </Svg>
  );
}

/** 风叶 / 植物（Plant 标签，对齐 web FanIcon）。 */
export function FanIcon(p: IconProps): React.JSX.Element {
  const s = p.size ?? 24;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M10.827 16.379a6.082 6.082 0 0 1-8.618-7.002l5.412 1.45a6.082 6.082 0 0 1 7.002-8.618l-1.45 5.412a6.082 6.082 0 0 1 8.618 7.002l-5.412-1.45a6.082 6.082 0 0 1-7.002 8.618l1.45-5.412Z"
        {...stroke(p)}
      />
      <Path d="M12 12v.01" {...stroke(p)} />
    </Svg>
  );
}

/** 设置（Settings 标签）。 */
export function SettingsIcon(p: IconProps): React.JSX.Element {
  const s = p.size ?? 24;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        {...stroke(p)}
      />
      <Circle cx="12" cy="12" r="3" {...stroke(p)} />
    </Svg>
  );
}

/** 设备/传感器（设备状态卡）。 */
export function DeviceIcon(p: IconProps): React.JSX.Element {
  const s = p.size ?? 24;
  const c = p.color ?? '#141414';
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Rect x="4" y="6" width="16" height="12" rx="2" {...stroke(p)} />
      <Circle cx="8" cy="12" r="1.5" fill={c} />
      <Circle cx="16" cy="12" r="1.5" fill={c} />
    </Svg>
  );
}

/** 太阳（植物场景）。 */
export function SunIcon(p: IconProps): React.JSX.Element {
  const s = p.size ?? 24;
  const c = p.color ?? '#E8A93C';
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="5" fill={c} />
      <Path
        d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** 电池（设备状态卡），level 0-1。 */
export function BatteryIcon({level = 1, color = '#9B9590', fill = '#FB4B00', size = 22}: {level?: number; color?: string; fill?: string; size?: number}): React.JSX.Element {
  const w = size;
  const h = (size / 22) * 12;
  return (
    <Svg width={w} height={h} viewBox="0 0 22 12">
      <Rect x="0.5" y="0.5" width="18" height="11" rx="2" stroke={color} strokeWidth={1} fill="none" />
      <Rect x="20" y="4" width="2" height="4" rx="1" fill={color} />
      <Rect x="2" y="2" width={Math.max(0, Math.min(1, level)) * 15} height="8" rx="1" fill={fill} />
    </Svg>
  );
}
