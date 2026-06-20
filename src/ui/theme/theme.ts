/**
 * @file theme.ts
 * @description 设计 token：间距 / 圆角 / 字号 / 阴影 + 姿态状态色辅助。对齐 web/ 的 haptic 半径与柔和阴影。
 *
 * [WHO] 导出 `spacing` / `radius` / `font` / `shadow` / `theme` / `statusColor`
 * [FROM] 依赖 ./colors
 * [TO] 被 src/ui 各组件/屏消费
 * [HERE] src/ui/theme/theme.ts · 设计 token
 */
import {colors} from './colors';

export const spacing = {xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32};

/** 对齐 web haptic 半径：surface 4 / frame 8 / shell 16 / pill。 */
export const radius = {sm: 8, md: 12, lg: 16, pill: 9999};

export const font = {
  sizeXs: 12,
  sizeSm: 14,
  sizeMd: 15,
  sizeLg: 18,
  sizeXl: 22,
  sizeScore: 56,
  weightBold: '700' as const,
  weightHeavy: '800' as const,
};

/** RN 阴影（iOS shadow* + Android elevation；RNW 会转 boxShadow）。 */
export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  pill: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 2,
  },
};

/** 姿态 → 状态色。 */
export function statusColor(posture: string): string {
  switch (posture) {
    case 'NORMAL':
      return colors.statusNormal;
    case 'OFFLINE':
      return colors.statusOffline;
    case 'TECH_NECK':
      return colors.statusWarning;
    default:
      return colors.statusAlert; // SLUMPED / LEFT_LEAN
  }
}

export const theme = {colors, spacing, radius, font, shadow};
export type Theme = typeof theme;
