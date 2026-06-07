import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const hapticBadgeVariants = cva("haptic-badge", {
  variants: {
    color: {
      red: "haptic-badge--color-red",
      orange: "haptic-badge--color-orange",
      yellow: "haptic-badge--color-yellow",
      green: "haptic-badge--color-green",
      blue: "haptic-badge--color-blue",
      purple: "haptic-badge--color-purple",
      grey: "haptic-badge--color-grey",
    },
    variant: {
      dot: "haptic-badge--variant-dot",
      pill: "haptic-badge--variant-pill",
      count: "haptic-badge--variant-count",
      outline: "haptic-badge--variant-outline",
    },
    size: {
      smaller: "haptic-badge--size-smaller",
      default: "haptic-badge--size-default",
      bigger: "haptic-badge--size-bigger",
    },
  },
  defaultVariants: {
    color: "red",
    variant: "pill",
    size: "default",
  },
})

type HapticBadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof hapticBadgeVariants> & {
    count?: number
    max?: number
    label?: string
  }

function HapticBadge({
  className,
  color = "red",
  variant = "pill",
  size = "default",
  count,
  max = 99,
  label,
  children,
  style,
  ...props
}: HapticBadgeProps) {
  const display = count !== undefined && count > max ? `${max}+` : count

  return (
    <span
      data-slot="haptic-badge"
      data-color={color}
      data-variant={variant}
      data-size={size}
      className={cn(
        hapticBadgeVariants({ color, variant, size }),
        className
      )}
      style={style}
      {...props}
    >
      {variant === "count" && count !== undefined
        ? display
        : label ?? children}
    </span>
  )
}

export { HapticBadge, hapticBadgeVariants }
