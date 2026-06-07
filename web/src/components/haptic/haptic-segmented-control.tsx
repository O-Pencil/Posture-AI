import * as React from "react"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"
import { springSnappy, springSoft } from "./motion"

type HapticSegmentedOption = {
  value: string
  label: React.ReactNode
  icon?: React.ReactNode
  disabled?: boolean
}

type HapticSegmentedControlProps = React.ComponentProps<"div"> & {
  options: HapticSegmentedOption[]
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}

function HapticSegmentedControl({
  className,
  options,
  value,
  onValueChange,
  disabled,
  ...props
}: HapticSegmentedControlProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = React.useState<{
    x: number
    width: number
  } | null>(null)

  const updateIndicator = React.useCallback(() => {
    if (!containerRef.current) return
    const active = containerRef.current.querySelector<HTMLButtonElement>(
      `[data-segment-value="${CSS.escape(value ?? "")}"]`
    )
    if (!active) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const rect = active.getBoundingClientRect()
    setIndicator({
      x: rect.left - containerRect.left,
      width: rect.width,
    })
  }, [value])

  React.useLayoutEffect(() => {
    updateIndicator()
  }, [updateIndicator, options])

  React.useEffect(() => {
    const onResize = () => updateIndicator()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [updateIndicator])

  return (
    <div
      ref={containerRef}
      data-slot="haptic-segmented-control"
      className={cn("haptic-segmented", className)}
      role="tablist"
      {...props}
    >
      <AnimatePresence>
        {indicator && (
          <motion.span
            className="haptic-segmented__indicator"
            initial={false}
            animate={{ x: indicator.x, width: indicator.width }}
            transition={springSnappy}
            aria-hidden
          />
        )}
      </AnimatePresence>
      {options.map((option) => {
        const active = option.value === value
        return (
          <motion.button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-segment-value={option.value}
            data-active={active}
            disabled={disabled || option.disabled}
            onClick={() => onValueChange?.(option.value)}
            className="haptic-segmented__item"
            whileHover={
              !disabled && !option.disabled ? { y: -0.5 } : undefined
            }
            whileTap={
              !disabled && !option.disabled ? { y: 0.5 } : undefined
            }
            transition={springSoft}
          >
            {option.icon}
            <span className="haptic-segmented__label">{option.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

export { HapticSegmentedControl }
export type { HapticSegmentedOption }
