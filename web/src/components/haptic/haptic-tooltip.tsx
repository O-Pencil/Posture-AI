import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { springSnappy } from "./motion"

const hapticTooltipVariants = cva("haptic-tooltip", {
  variants: {
    side: {
      top: "haptic-tooltip--side-top",
      bottom: "haptic-tooltip--side-bottom",
      left: "haptic-tooltip--side-left",
      right: "haptic-tooltip--side-right",
    },
    variant: {
      default: "haptic-tooltip--variant-default",
      dark: "haptic-tooltip--variant-dark",
      light: "haptic-tooltip--variant-light",
      accent: "haptic-tooltip--variant-accent",
    },
    size: {
      smaller: "haptic-tooltip--size-smaller",
      default: "haptic-tooltip--size-default",
      bigger: "haptic-tooltip--size-bigger",
    },
  },
  defaultVariants: {
    side: "top",
    variant: "default",
    size: "default",
  },
})

type HapticTooltipProps = React.ComponentProps<"div"> &
  VariantProps<typeof hapticTooltipVariants> & {
    content: React.ReactNode
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    delay?: number
    children: React.ReactElement
  }

function HapticTooltip({
  className,
  side = "top",
  variant = "default",
  size = "default",
  content,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  delay = 120,
  children,
  ...props
}: HapticTooltipProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const timer = React.useRef<number | null>(null)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = (v: boolean) => {
    if (!isControlled) setUncontrolledOpen(v)
    onOpenChange?.(v)
  }

  const show = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(true), delay)
  }

  const hide = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    setOpen(false)
  }

  React.useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  // Inject trigger props into the single child element
  type TriggerProps = {
    onMouseEnter?: React.MouseEventHandler
    onMouseLeave?: React.MouseEventHandler
    onFocus?: React.FocusEventHandler
    onBlur?: React.FocusEventHandler
  }

  const trigger = React.isValidElement(children)
    ? (() => {
        const child = children as React.ReactElement<TriggerProps>
        return React.cloneElement(child, {
          onMouseEnter: (e) => {
            show()
            child.props.onMouseEnter?.(e)
          },
          onMouseLeave: (e) => {
            hide()
            child.props.onMouseLeave?.(e)
          },
          onFocus: (e) => {
            show()
            child.props.onFocus?.(e)
          },
          onBlur: (e) => {
            hide()
            child.props.onBlur?.(e)
          },
        })
      })()
    : children

  return (
    <span
      data-slot="haptic-tooltip-wrapper"
      className="haptic-tooltip__wrapper"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            data-slot="haptic-tooltip"
            data-side={side}
            data-variant={variant}
            data-size={size}
            className={cn(hapticTooltipVariants({ side, variant, size }), className)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={springSnappy}
            {...(props as React.ComponentProps<typeof motion.span>)}
          >
            <span className="haptic-tooltip__content">{content}</span>
            <span className="haptic-tooltip__arrow" aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

export { HapticTooltip, hapticTooltipVariants }
