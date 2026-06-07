import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon } from "./icons"
import { springSnappy, springSoft } from "./motion"

const hapticSelectTriggerVariants = cva("haptic-select__trigger", {
  variants: {
    size: {
      smaller: "haptic-select__trigger--size-smaller",
      default: "haptic-select__trigger--size-default",
      bigger: "haptic-select__trigger--size-bigger",
    },
    state: {
      default: "",
      open: "haptic-select__trigger--open",
      error: "haptic-select__trigger--error",
    },
  },
  defaultVariants: {
    size: "default",
    state: "default",
  },
})

type HapticSelectOption = {
  value: string
  label: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
  icon?: React.ReactNode
}

type HapticSelectProps = Omit<
  React.ComponentProps<"div">,
  "onChange"
> &
  VariantProps<typeof hapticSelectTriggerVariants> & {
    options: HapticSelectOption[]
    value?: string
    onValueChange?: (value: string) => void
    placeholder?: string
    disabled?: boolean
    label?: string
  }

function HapticSelect({
  className,
  size = "default",
  state,
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  disabled,
  label,
  ...props
}: HapticSelectProps) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)
  const resolvedState = state ?? (open ? "open" : "default")

  React.useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      data-slot="haptic-select"
      data-open={open}
      data-disabled={disabled}
      className={cn("haptic-select", className)}
      {...props}
    >
      {label && <label className="haptic-select__label">{label}</label>}
      <motion.button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(hapticSelectTriggerVariants({ size, state: resolvedState }))}
        whileHover={!disabled ? { y: -0.5 } : undefined}
        whileTap={!disabled ? { y: 0.5 } : undefined}
        transition={springSoft}
      >
        <span className="haptic-select__value">
          {selected ? (
            <>
              {selected.icon}
              <span>{selected.label}</span>
            </>
          ) : (
            <span className="haptic-select__placeholder">{placeholder}</span>
          )}
        </span>
        <motion.span
          className="haptic-select__chevron"
          animate={{ rotate: open ? 180 : 0 }}
          transition={springSnappy}
          aria-hidden
        >
          <ChevronDownIcon />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            className="haptic-select__list"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={springSnappy}
          >
            {options.map((option) => {
              const active = option.value === value
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={active}
                  aria-disabled={option.disabled}
                  data-active={active}
                  data-disabled={option.disabled}
                  className="haptic-select__option"
                  onClick={() => {
                    if (option.disabled) return
                    onValueChange?.(option.value)
                    setOpen(false)
                  }}
                >
                  {option.icon && (
                    <span className="haptic-select__option-icon">
                      {option.icon}
                    </span>
                  )}
                  <span className="haptic-select__option-content">
                    <span className="haptic-select__option-label">
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="haptic-select__option-description">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {active && (
                    <span className="haptic-select__option-check" aria-hidden>
                      <CheckIcon />
                    </span>
                  )}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export { HapticSelect, hapticSelectTriggerVariants }
export type { HapticSelectOption }
