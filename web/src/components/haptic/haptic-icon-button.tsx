import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "motion/react"

import { cn } from "@/lib/utils"
import { FilterIcon, UtilityPlusIcon } from "./icons"
import { springSoft } from "./motion"
import type { HapticButtonVariant } from "./tokens"
import { hapticButtonVariants } from "./haptic-button"

type HapticIconButtonProps = Omit<HTMLMotionProps<"button">, "children"> &
  VariantProps<typeof hapticButtonVariants> & {
    icon?: React.ReactNode
    "aria-label": string
  }

function HapticIconButton({
  className,
  variant = "standard",
  icon,
  disabled,
  ...props
}: HapticIconButtonProps) {
  const defaultIcon =
    variant === "primary" ? <UtilityPlusIcon /> : <FilterIcon />

  return (
    <motion.button
      type="button"
      data-slot="haptic-icon-button"
      data-variant={variant}
      disabled={disabled}
      className={cn(
        hapticButtonVariants({ variant }),
        "haptic-btn--icon-only",
        className
      )}
      whileHover={!disabled ? { y: -0.5 } : undefined}
      whileTap={!disabled ? { y: 0.5, scale: 0.99 } : undefined}
      transition={springSoft}
      {...props}
    >
      <span className="haptic-btn__icon">{icon ?? defaultIcon}</span>
    </motion.button>
  )
}

export { HapticIconButton }
export type { HapticButtonVariant }
