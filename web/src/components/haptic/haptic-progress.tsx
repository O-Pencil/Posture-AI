import * as React from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { springSnappy } from "./motion"
import { HAPTIC_GRADIENTS, HAPTIC_PALETTE } from "./tokens"

type HapticProgressVariant = "blue" | "green" | "orange" | "red" | "gradient"

type HapticProgressProps = React.ComponentProps<"div"> & {
  value?: number
  max?: number
  variant?: HapticProgressVariant
  showLabel?: boolean
  label?: string
  striped?: boolean
  indeterminate?: boolean
}

const VARIANT_GRADIENT: Record<HapticProgressVariant, string> = {
  blue: HAPTIC_GRADIENTS.brand,
  green: `linear-gradient(to right, #9ee88a, #3a9e1f)`,
  orange: HAPTIC_GRADIENTS.brand,
  red: `linear-gradient(to right, #ff9a9a, #c20a0a)`,
  gradient: `linear-gradient(90deg, ${HAPTIC_PALETTE.brandLight} 0%, #7dd957 55%, ${HAPTIC_PALETTE.brand} 100%)`,
}

function HapticProgress({
  className,
  value = 0,
  max = 100,
  variant = "orange",
  showLabel = false,
  label,
  striped = false,
  indeterminate = false,
  ...props
}: HapticProgressProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  const displayLabel = label ?? `${Math.round(percent)}%`

  return (
    <div
      data-slot="haptic-progress"
      data-variant={variant}
      data-striped={striped}
      data-indeterminate={indeterminate}
      className={cn("haptic-progress", className)}
      {...props}
    >
      <div className="haptic-progress__track">
        <motion.div
          className="haptic-progress__fill"
          initial={false}
          animate={{
            width: indeterminate ? "40%" : `${percent}%`,
            x: indeterminate ? ["-100%", "260%"] : 0,
          }}
          transition={
            indeterminate
              ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
              : springSnappy
          }
          style={{ background: VARIANT_GRADIENT[variant] }}
        >
          {striped && <span className="haptic-progress__stripes" aria-hidden />}
          <span className="haptic-progress__shine" aria-hidden />
        </motion.div>
      </div>
      {showLabel && (
        <div className="haptic-progress__label" aria-live="polite">
          {displayLabel}
        </div>
      )}
    </div>
  )
}

export { HapticProgress }
export type { HapticProgressVariant }
