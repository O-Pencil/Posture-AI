/**
 * Haptic 组件命名约束
 *
 * 所有交互控件统一为 Haptic 组件（`Haptic*` + `haptic-*`），用组件名区分语义：
 * - HapticSwitch — 开关
 * - HapticSlider — 滑块
 * - HapticButton / HapticIconButton — Utility 风格按钮（variant: standard / primary）
 *
 * | 维度   | 属性名   | 取值                              | 适用组件              |
 * |--------|----------|-----------------------------------|-----------------------|
 * | 变体   | variant  | standard · primary                | Button · IconButton   |
 * | 尺寸   | size     | smaller · default · bigger        | Selector · Chip 等    |
 * | 形状   | shape    | rounded · pill                    | Chip                  |
 * | 交互态 | state    | default · hover · pressed (+ disabled) | Selector          |
 * | 选中   | checked  | boolean                           | Switch                |
 * | 选中   | selected | boolean                           | Radio · Checkbox      |
 * | 色调   | tone     | light · dark                      | Chip                  |
 * | 内凹框 | indent   | boolean                           | Button · Selector     |
 *
 * 圆角层级（由外到内）：
 * - shell   16px — 外圈 indent
 * - frame    8px — bevel / Checkbox
 * - surface  4px — face / Chip rounded
 * - pill  9999px — 胶囊形 Switch / Radio
 *
 * 配色基准（Utility 设计稿，CSS `--color-haptic-*` 同源）：
 * - brand #fb4b00 · brand-dark #cc3402 · surface #fafafa · canvas #f5f5f5
 */

/** 统一配色（与 index.css @theme 同步） */
export const HAPTIC_PALETTE = {
  brand: "#fb4b00",
  brandDark: "#cc3402",
  brandLight: "#ffa060",
  brandForeground: "#fff0ea",
  surface: "#fafafa",
  canvas: "#f5f5f5",
  foreground: "#333333",
  foregroundStrong: "#141414",
  neutralStart: "#ffffff",
  neutralEnd: "#e5e5e5",
  indentStart: "#e5e5e5",
  indentEnd: "#ffffff",
  selectedStart: "#ffa060",
  selectedEnd: "#cc3402",
} as const

export const HAPTIC_GRADIENTS = {
  neutral: `linear-gradient(to bottom, ${HAPTIC_PALETTE.neutralStart}, ${HAPTIC_PALETTE.neutralEnd})`,
  selected: `linear-gradient(to bottom, ${HAPTIC_PALETTE.selectedStart}, ${HAPTIC_PALETTE.selectedEnd})`,
  indent: `linear-gradient(to bottom, ${HAPTIC_PALETTE.indentStart}, ${HAPTIC_PALETTE.indentEnd})`,
  brand: `linear-gradient(to bottom, ${HAPTIC_PALETTE.brandLight}, ${HAPTIC_PALETTE.brandDark})`,
  thumb: `linear-gradient(to bottom, ${HAPTIC_PALETTE.neutralStart}, ${HAPTIC_PALETTE.neutralEnd})`,
} as const

export const HAPTIC_ELEVATION = {
  default:
    "0 1px 2px rgba(22, 36, 44, 0.06), 0 0 0 1px rgba(22, 36, 44, 0.06)",
  pressed: "inset 0 1px 2px rgba(22, 36, 44, 0.06)",
} as const

/** 统一尺寸 */
export type HapticSize = "smaller" | "default" | "bigger"

/** 统一形状 */
export type HapticShape = "rounded" | "pill"

/** 统一交互态（不含 disabled） */
export type HapticInteractionState = "default" | "hover" | "pressed"

export type HapticButtonVariant = "standard" | "primary"
export type HapticChipColor =
  | "white"
  | "grey"
  | "yellow"
  | "green"
  | "red"
  | "blue"
  | "purple"
export type HapticChipTone = "light" | "dark"
/** @deprecated 使用 HapticButtonVariant */
export type HapticUtilityButtonVariant = HapticButtonVariant
/** @deprecated 使用 HapticSize */
export type HapticSelectorSize = HapticSize
/** @deprecated 使用 HapticInteractionState */
export type HapticSelectorState = HapticInteractionState
/** @deprecated 使用 HapticSize */
export type HapticChipSize = HapticSize
/** @deprecated 使用 HapticShape */
export type HapticChipShape = HapticShape

/** Figma 圆角层级（与 --radius-haptic-* 对应） */
export const HAPTIC_RADIUS = {
  shell: "1rem",
  frame: "0.5rem",
  surface: "0.25rem",
  pill: "9999px",
} as const

/** 嵌套 padding */
export const HAPTIC_PADDING = {
  shell: "0.5rem",
  selectorShell: "0.75rem",
  frame: "0.25rem",
} as const

export const HAPTIC_INDENT = {
  start: HAPTIC_PALETTE.indentStart,
  end: HAPTIC_PALETTE.indentEnd,
} as const

export const HAPTIC_CHIP_COLORS: Record<
  HapticChipColor,
  { light: { bg: string; text: string }; dark: { bg: string; text: string } }
> = {
  white: {
    light: { bg: HAPTIC_PALETTE.neutralStart, text: HAPTIC_PALETTE.foregroundStrong },
    dark: { bg: "#bfbfbf", text: HAPTIC_PALETTE.brandForeground },
  },
  grey: {
    light: { bg: HAPTIC_PALETTE.surface, text: HAPTIC_PALETTE.foregroundStrong },
    dark: { bg: "#8c8c8c", text: HAPTIC_PALETTE.brandForeground },
  },
  yellow: {
    light: { bg: "#ffb84d", text: HAPTIC_PALETTE.foregroundStrong },
    dark: { bg: HAPTIC_PALETTE.brandDark, text: HAPTIC_PALETTE.brandForeground },
  },
  green: {
    light: { bg: "#7dd957", text: HAPTIC_PALETTE.foregroundStrong },
    dark: { bg: "#3a9e1f", text: HAPTIC_PALETTE.brandForeground },
  },
  red: {
    light: { bg: "#ff7070", text: HAPTIC_PALETTE.foregroundStrong },
    dark: { bg: "#c20a0a", text: HAPTIC_PALETTE.brandForeground },
  },
  blue: {
    light: { bg: HAPTIC_PALETTE.brandLight, text: HAPTIC_PALETTE.foregroundStrong },
    dark: { bg: HAPTIC_PALETTE.brandDark, text: HAPTIC_PALETTE.brandForeground },
  },
  purple: {
    light: { bg: "#c49bff", text: HAPTIC_PALETTE.foregroundStrong },
    dark: { bg: "#8b5cf6", text: HAPTIC_PALETTE.brandForeground },
  },
}

export const HAPTIC_SELECTOR_SELECTED = {
  start: HAPTIC_PALETTE.selectedStart,
  end: HAPTIC_PALETTE.selectedEnd,
} as const

export const HAPTIC_SELECTOR_UNSELECTED = {
  start: HAPTIC_PALETTE.neutralStart,
  end: HAPTIC_PALETTE.neutralEnd,
} as const
