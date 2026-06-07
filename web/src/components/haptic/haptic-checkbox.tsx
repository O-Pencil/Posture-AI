import { cva, type VariantProps } from "class-variance-authority"
import { motion, type HTMLMotionProps } from "motion/react"

import { cn } from "@/lib/utils"
import { CheckIcon } from "./icons"
import { HAPTIC_ELEVATION, HAPTIC_GRADIENT, springSnappy, springSoft } from "./motion"
import type { HapticInteractionState, HapticSize } from "./tokens"

const hapticCheckboxVariants = cva("haptic-checkbox", {
  variants: {
    size: {
      smaller: "haptic-checkbox--size-smaller",
      default: "haptic-checkbox--size-default",
      bigger: "haptic-checkbox--size-bigger",
    },
    indent: {
      true: "haptic-checkbox--indent",
      false: "haptic-checkbox--no-indent",
    },
    state: {
      default: "haptic-checkbox--default",
      hover: "haptic-checkbox--hover",
      pressed: "haptic-checkbox--pressed",
    },
    selected: {
      true: "haptic-checkbox--selected",
      false: "haptic-checkbox--unselected",
    },
  },
  defaultVariants: {
    size: "smaller",
    indent: false,
    state: "default",
    selected: false,
  },
})

type HapticCheckboxProps = HTMLMotionProps<"button"> &
  VariantProps<typeof hapticCheckboxVariants>

function HapticCheckbox({
  className,
  size = "smaller",
  indent = false,
  state = "default",
  selected = false,
  disabled,
  ...props
}: HapticCheckboxProps) {
  const isStatic = state !== "default"

  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={selected ?? false}
      data-slot="haptic-checkbox"
      data-state={state}
      data-size={size}
      data-indent={indent}
      data-selected={selected}
      disabled={disabled}
      className={cn(
        hapticCheckboxVariants({ size, indent, state, selected, className })
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
        className="haptic-checkbox__dot"
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
        initial={false}
        transition={springSnappy}
      >
        <motion.span
          className="haptic-checkbox__check"
          initial={false}
          animate={{
            opacity: selected ? 1 : 0,
            scale: selected ? 1 : 0.5,
          }}
          transition={springSnappy}
        >
          <CheckIcon />
        </motion.span>
      </motion.span>
    </motion.button>
  )
}

export { HapticCheckbox, hapticCheckboxVariants }
export type { HapticInteractionState, HapticSize }
