import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "motion/react"

import { cn } from "@/lib/utils"
import { FilterIcon, UtilityPlusIcon } from "./icons"
import { springSoft } from "./motion"
import type { HapticButtonVariant } from "./tokens"

export const hapticButtonVariants = cva("haptic-btn", {
  variants: {
    variant: {
      standard: "haptic-btn--standard",
      primary: "haptic-btn--primary",
    },
  },
  defaultVariants: {
    variant: "standard",
  },
})

type HapticButtonProps = Omit<HTMLMotionProps<"button">, "children"> &
  VariantProps<typeof hapticButtonVariants> & {
    label?: string
    leftIcon?: React.ReactNode
    showLeftIcon?: boolean
  }

function HapticButton({
  className,
  variant = "standard",
  label = "Button",
  leftIcon,
  showLeftIcon = true,
  disabled,
  ...props
}: HapticButtonProps) {
  const defaultIcon =
    variant === "primary" ? <UtilityPlusIcon /> : <FilterIcon />

  return (
    <motion.button
      type="button"
      data-slot="haptic-button"
      data-variant={variant}
      disabled={disabled}
      className={cn(hapticButtonVariants({ variant, className }))}
      whileHover={!disabled ? { y: -0.5 } : undefined}
      whileTap={!disabled ? { y: 0.5, scale: 0.99 } : undefined}
      transition={springSoft}
      {...props}
    >
      {showLeftIcon && (
        <span className="haptic-btn__icon">{leftIcon ?? defaultIcon}</span>
      )}
      <span className="haptic-btn__label">{label}</span>
    </motion.button>
  )
}

export { HapticButton }
export type { HapticButtonVariant }
