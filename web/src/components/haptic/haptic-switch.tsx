import { motion, type HTMLMotionProps } from "motion/react"

import { cn } from "@/lib/utils"
import { springSoft } from "./motion"

type HapticSwitchProps = Omit<HTMLMotionProps<"button">, "onChange"> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function HapticSwitch({
  className,
  checked = false,
  onCheckedChange,
  disabled,
  ...props
}: HapticSwitchProps) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      data-slot="haptic-switch"
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      className={cn("haptic-switch", className)}
      onClick={() => onCheckedChange?.(!checked)}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      transition={springSoft}
      {...props}
    />
  )
}

export { HapticSwitch }
