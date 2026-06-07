import { motion, type HTMLMotionProps } from "motion/react"

import { cn } from "@/lib/utils"
import { MinusIcon, PlusIcon } from "./icons"
import { springSnappy, springSoft } from "./motion"

type HapticStepperProps = Omit<HTMLMotionProps<"div">, "onChange"> & {
  value?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  disabled?: boolean
}

function HapticStepper({
  className,
  value = 0,
  onValueChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  label,
  disabled,
  ...props
}: HapticStepperProps) {
  const dec = () => onValueChange?.(Math.max(min, value - step))
  const inc = () => onValueChange?.(Math.min(max, value + step))
  const atMin = value <= min
  const atMax = value >= max

  return (
    <motion.div
      data-slot="haptic-stepper"
      className={cn("haptic-stepper", className)}
      {...props}
    >
      <motion.button
        type="button"
        aria-label="Decrease"
        disabled={disabled || atMin}
        onClick={dec}
        className="haptic-stepper__btn"
        whileHover={!disabled && !atMin ? { y: -0.5 } : undefined}
        whileTap={!disabled && !atMin ? { y: 0.5, scale: 0.96 } : undefined}
        transition={springSoft}
      >
        <MinusIcon />
      </motion.button>

      <div className="haptic-stepper__value" aria-live="polite">
        <span className="haptic-stepper__number">
          {label ?? value}
        </span>
      </div>

      <motion.button
        type="button"
        aria-label="Increase"
        disabled={disabled || atMax}
        onClick={inc}
        className="haptic-stepper__btn"
        whileHover={!disabled && !atMax ? { y: -0.5 } : undefined}
        whileTap={!disabled && !atMax ? { y: 0.5, scale: 0.96 } : undefined}
        transition={springSoft}
      >
        <PlusIcon />
      </motion.button>
    </motion.div>
  )
}

export { HapticStepper }
export { springSnappy }
