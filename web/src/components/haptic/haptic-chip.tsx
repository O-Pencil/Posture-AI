import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { PlusIcon } from "./icons"
import {
  HAPTIC_CHIP_COLORS,
  type HapticChipColor,
  type HapticChipTone,
  type HapticShape,
  type HapticSize,
} from "./tokens"

const hapticChipVariants = cva("haptic-chip", {
  variants: {
    color: {
      white: "haptic-chip--white",
      grey: "haptic-chip--grey",
      yellow: "haptic-chip--yellow",
      green: "haptic-chip--green",
      red: "haptic-chip--red",
      blue: "haptic-chip--blue",
      purple: "haptic-chip--purple",
    },
    tone: {
      light: "haptic-chip--tone-light",
      dark: "haptic-chip--tone-dark",
    },
    size: {
      smaller: "haptic-chip--size-smaller",
      default: "haptic-chip--size-default",
      bigger: "haptic-chip--size-bigger",
    },
    shape: {
      rounded: "haptic-chip--shape-rounded",
      pill: "haptic-chip--shape-pill",
    },
  },
  defaultVariants: {
    color: "white",
    tone: "light",
    size: "smaller",
    shape: "rounded",
  },
})

type HapticChipProps = React.ComponentProps<"span"> &
  VariantProps<typeof hapticChipVariants> & {
    label?: string
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
    showLeftIcon?: boolean
    showRightIcon?: boolean
    /** @deprecated 使用 tone="dark" */
    dark?: boolean
  }

function HapticChip({
  className,
  color = "white",
  tone,
  dark,
  size = "smaller",
  shape = "rounded",
  label = "Chip",
  leftIcon,
  rightIcon,
  showLeftIcon = true,
  showRightIcon = true,
  style,
  ...props
}: HapticChipProps) {
  const resolvedTone: HapticChipTone =
    tone ?? (dark ? "dark" : "light")
  const palette = HAPTIC_CHIP_COLORS[color!][resolvedTone]

  const cssVars = {
    "--haptic-chip-bg": palette.bg,
    "--haptic-chip-text": palette.text,
  } as React.CSSProperties

  return (
    <span
      data-slot="haptic-chip"
      data-color={color}
      data-tone={resolvedTone}
      data-size={size}
      data-shape={shape}
      className={cn(
        hapticChipVariants({
          color,
          tone: resolvedTone,
          size,
          shape,
          className,
        })
      )}
      style={{ ...cssVars, ...style }}
      {...props}
    >
      {showLeftIcon && (leftIcon ?? <PlusIcon />)}
      <span className="haptic-chip__label">{label}</span>
      {showRightIcon && (rightIcon ?? <PlusIcon />)}
    </span>
  )
}

export { HapticChip, hapticChipVariants }
export type { HapticChipColor, HapticChipTone, HapticShape, HapticSize }
