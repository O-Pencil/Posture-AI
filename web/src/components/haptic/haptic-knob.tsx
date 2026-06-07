import * as React from "react"
import { motion } from "motion/react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { springSoft } from "./motion"

const hapticKnobVariants = cva("haptic-knob", {
  variants: {
    size: {
      smaller: "haptic-knob--size-smaller",
      default: "haptic-knob--size-default",
      bigger: "haptic-knob--size-bigger",
    },
    variant: {
      default: "haptic-knob--variant-default",
      metal: "haptic-knob--variant-metal",
      neon: "haptic-knob--variant-neon",
    },
  },
  defaultVariants: {
    size: "default",
    variant: "default",
  },
})

const SIZE_PX: Record<"smaller" | "default" | "bigger", number> = {
  smaller: 56,
  default: 80,
  bigger: 112,
}

const ARC_START = -135
const ARC_END = 135

type HapticKnobProps = Omit<
  React.ComponentProps<"div">,
  "onChange" | "onDrag" | "onDragStart" | "onDragEnd"
> &
  VariantProps<typeof hapticKnobVariants> & {
    value?: number
    onValueChange?: (value: number) => void
    min?: number
    max?: number
    step?: number
    label?: React.ReactNode
    disabled?: boolean
  }

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function valueToAngle(v: number, min: number, max: number) {
  const ratio = (clamp(v, min, max) - min) / (max - min)
  return ARC_START + ratio * (ARC_END - ARC_START)
}

function HapticKnob({
  className,
  size = "default",
  variant = "default",
  value = 0,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled,
  ...props
}: HapticKnobProps) {
  const px = SIZE_PX[size!]
  const angle = valueToAngle(value, min, max)
  const dragStartAngle = React.useRef<number | null>(null)
  const dragStartValue = React.useRef<number>(value)
  const ref = React.useRef<HTMLDivElement>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    dragStartAngle.current = angle
    dragStartValue.current = value
    ref.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartAngle.current === null || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const pointerAngle =
      (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI
    let delta = pointerAngle + 90 // convert to 0 = top
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    // Convert to a 0..1 progress in the [-135, 135] range, mapping -135 to -1.5
    const ratio = clamp((delta + 135) / 270, 0, 1)
    const raw = min + ratio * (max - min)
    const stepped = Math.round(raw / step) * step
    onValueChange?.(clamp(stepped, min, max))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    dragStartAngle.current = null
    ref.current?.releasePointerCapture(e.pointerId)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    let next: number | null = null
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      next = Math.min(max, value + step)
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      next = Math.max(min, value - step)
    } else if (e.key === "Home") {
      next = min
    } else if (e.key === "End") {
      next = max
    }
    if (next !== null) {
      e.preventDefault()
      onValueChange?.(next)
    }
  }

  const percent = ((value - min) / (max - min)) * 100
  // Build a conic-gradient style for the active arc
  const arcStyle: React.CSSProperties = {
    background: `conic-gradient(from ${
      ARC_START + 90
    }deg, var(--haptic-knob-arc-active) 0%, var(--haptic-knob-arc-active) ${percent}%, var(--haptic-knob-arc-inactive) ${percent}%, var(--haptic-knob-arc-inactive) 100%)`,
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled}
      data-slot="haptic-knob"
      data-size={size}
      data-variant={variant}
      data-disabled={disabled}
      className={cn(hapticKnobVariants({ size, variant }), className)}
      style={{ width: px, height: px }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      {...props}
    >
      <div className="haptic-knob__track" style={arcStyle} aria-hidden />
      <motion.div
        className="haptic-knob__cap"
        animate={{ rotate: angle }}
        transition={springSoft}
      >
        <div className="haptic-knob__indicator" aria-hidden />
      </motion.div>
      <div className="haptic-knob__value" aria-hidden>
        {label ?? value}
      </div>
    </div>
  )
}

export { HapticKnob, hapticKnobVariants }
