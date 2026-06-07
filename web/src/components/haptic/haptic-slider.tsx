import * as React from "react"

import { cn } from "@/lib/utils"

type HapticSliderProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange"
> & {
  value?: number
  onValueChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
}

function HapticSlider({
  className,
  value = 0,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  ...props
}: HapticSliderProps) {
  const percent = ((value - min) / (max - min)) * 100

  return (
    <div
      data-slot="haptic-slider"
      className={cn("haptic-slider", disabled && "haptic-slider--disabled", className)}
    >
      <div className="haptic-slider__track">
        <div
          className="haptic-slider__fill"
          style={{ width: `${percent}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          className="haptic-slider__input"
          onChange={(e) => onValueChange?.(Number(e.target.value))}
          {...props}
        />
        <div
          className="haptic-slider__thumb"
          style={{ left: `calc(${percent}% - 0.625rem)` }}
        />
      </div>
    </div>
  )
}

export { HapticSlider }
