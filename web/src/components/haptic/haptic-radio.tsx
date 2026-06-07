import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "motion/react"

import { cn } from "@/lib/utils"
import { HAPTIC_ELEVATION, HAPTIC_GRADIENT, springSnappy, springSoft } from "./motion"
import type { HapticInteractionState, HapticSize } from "./tokens"

const hapticRadioVariants = cva("haptic-radio", {
  variants: {
    size: {
      smaller: "haptic-radio--size-smaller",
      default: "haptic-radio--size-default",
      bigger: "haptic-radio--size-bigger",
    },
    indent: {
      true: "haptic-radio--indent",
      false: "haptic-radio--no-indent",
    },
    state: {
      default: "haptic-radio--default",
      hover: "haptic-radio--hover",
      pressed: "haptic-radio--pressed",
    },
    selected: {
      true: "haptic-radio--selected",
      false: "haptic-radio--unselected",
    },
  },
  defaultVariants: {
    size: "smaller",
    indent: false,
    state: "default",
    selected: false,
  },
})

type HapticRadioProps = HTMLMotionProps<"button"> &
  VariantProps<typeof hapticRadioVariants>

function HapticRadio({
  className,
  size = "smaller",
  indent = false,
  state = "default",
  selected = false,
  disabled,
  ...props
}: HapticRadioProps) {
  const isStatic = state !== "default"

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected ?? false}
      data-slot="haptic-radio"
      data-state={state}
      data-size={size}
      data-indent={indent}
      data-selected={selected}
      disabled={disabled}
      className={cn(
        hapticRadioVariants({ size, indent, state, selected, className })
      )}
      whileHover={
        !disabled && !isStatic ? { scale: 1.06 } : undefined
      }
      whileTap={
        !disabled && !isStatic ? { scale: 0.94 } : undefined
      }
      transition={springSoft}
      {...props}
    >
      <motion.span
        className="haptic-radio__dot"
        aria-hidden
        animate={{
          background: selected
            ? HAPTIC_GRADIENT.selected
            : HAPTIC_GRADIENT.unselected,
          boxShadow:
            isStatic && state === "pressed"
              ? HAPTIC_ELEVATION.pressed
              : HAPTIC_ELEVATION.default,
        }}
        transition={springSnappy}
      />
    </motion.button>
  )
}

export { HapticRadio, hapticRadioVariants }
export type { HapticInteractionState, HapticSize }
