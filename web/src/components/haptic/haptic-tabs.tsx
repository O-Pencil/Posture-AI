import * as React from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { springSnappy } from "./motion"

type HapticTab = {
  value: string
  label: React.ReactNode
  icon?: React.ReactNode
  badge?: React.ReactNode
  disabled?: boolean
}

type HapticTabsProps = React.ComponentProps<"div"> & {
  tabs: HapticTab[]
  value?: string
  onValueChange?: (value: string) => void
  variant?: "default" | "pill" | "underline"
  disabled?: boolean
}

function HapticTabs({
  className,
  tabs,
  value,
  onValueChange,
  variant = "default",
  disabled,
  ...props
}: HapticTabsProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = React.useState<{
    x: number
    width: number
  } | null>(null)

  const updateIndicator = React.useCallback(() => {
    if (!containerRef.current) return
    const active = containerRef.current.querySelector<HTMLButtonElement>(
      `[data-tab-value="${CSS.escape(value ?? "")}"]`
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
  }, [updateIndicator, tabs])

  React.useEffect(() => {
    const onResize = () => updateIndicator()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [updateIndicator])

  return (
    <div
      ref={containerRef}
      data-slot="haptic-tabs"
      data-variant={variant}
      className={cn("haptic-tabs", className)}
      role="tablist"
      {...props}
    >
      {variant === "underline" && indicator && (
        <motion.span
          className="haptic-tabs__underline"
          initial={false}
          animate={{ x: indicator.x, width: indicator.width }}
          transition={springSnappy}
          aria-hidden
        />
      )}
      {variant === "pill" && indicator && (
        <motion.span
          className="haptic-tabs__pill"
          initial={false}
          animate={{ x: indicator.x, width: indicator.width }}
          transition={springSnappy}
          aria-hidden
        />
      )}
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-tab-value={tab.value}
            data-active={active}
            disabled={disabled || tab.disabled}
            onClick={() => onValueChange?.(tab.value)}
            className="haptic-tabs__item"
          >
            {tab.icon}
            <span className="haptic-tabs__label">{tab.label}</span>
            {tab.badge && <span className="haptic-tabs__badge">{tab.badge}</span>}
          </button>
        )
      })}
    </div>
  )
}

export { HapticTabs }
export type { HapticTab }
