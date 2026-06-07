import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "./icons"
import { springSoft } from "./motion"

const hapticAccordionItemVariants = cva("haptic-accordion__item", {
  variants: {
    variant: {
      default: "haptic-accordion__item--default",
      indented: "haptic-accordion__item--indented",
    },
  },
  defaultVariants: { variant: "default" },
})

type HapticAccordionContextValue = {
  openValues: Set<string>
  toggle: (value: string) => void
  collapsible: boolean
}

const HapticAccordionContext =
  React.createContext<HapticAccordionContextValue | null>(null)

function useAccordion() {
  const ctx = React.useContext(HapticAccordionContext)
  if (!ctx)
    throw new Error("HapticAccordionItem must be used inside HapticAccordion")
  return ctx
}

type HapticAccordionProps = React.ComponentProps<"div"> & {
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  defaultValue?: string | string[]
  collapsible?: boolean
  type?: "single" | "multiple"
}

function HapticAccordion({
  className,
  value,
  onValueChange,
  defaultValue,
  collapsible = true,
  type = "single",
  children,
  ...props
}: HapticAccordionProps) {
  const [internalValue, setInternalValue] = React.useState<string[]>(() => {
    if (value !== undefined) return Array.isArray(value) ? value : [value]
    if (defaultValue !== undefined)
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue]
    return []
  })

  const current = value !== undefined
    ? Array.isArray(value)
      ? value
      : [value]
    : internalValue

  const toggle = React.useCallback(
    (v: string) => {
      let next: string[]
      if (current.includes(v)) {
        if (!collapsible && type === "single" && current.length === 1) return
        next = current.filter((x) => x !== v)
      } else {
        next = type === "single" ? [v] : [...current, v]
      }
      if (value === undefined) setInternalValue(next)
      onValueChange?.(type === "single" ? (next[0] ?? "") : next)
    },
    [collapsible, current, onValueChange, type, value]
  )

  const ctxValue = React.useMemo(
    () => ({
      openValues: new Set(current),
      toggle,
      collapsible,
    }),
    [current, toggle, collapsible]
  )

  return (
    <HapticAccordionContext.Provider value={ctxValue}>
      <div
        data-slot="haptic-accordion"
        data-type={type}
        className={cn("haptic-accordion", className)}
        {...props}
      >
        {children}
      </div>
    </HapticAccordionContext.Provider>
  )
}

type HapticAccordionItemProps = React.ComponentProps<"div"> &
  VariantProps<typeof hapticAccordionItemVariants> & {
    value: string
  }

function HapticAccordionItem({
  className,
  value,
  variant = "default",
  children,
  ...props
}: HapticAccordionItemProps) {
  const { openValues } = useAccordion()
  const open = openValues.has(value)
  return (
    <div
      data-slot="haptic-accordion-item"
      data-value={value}
      data-open={open}
      className={cn(hapticAccordionItemVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

type HapticAccordionTriggerProps = React.ComponentProps<"button">

function HapticAccordionTrigger({
  className,
  children,
  ...props
}: HapticAccordionTriggerProps) {
  const item = React.useContext(ItemContext)
  const { toggle, openValues } = useAccordion()
  if (!item)
    throw new Error(
      "HapticAccordionTrigger must be used inside HapticAccordionItem"
    )
  const open = openValues.has(item.value)
  return (
    <button
      type="button"
      data-slot="haptic-accordion-trigger"
      data-open={open}
      aria-expanded={open}
      onClick={() => toggle(item.value)}
      className={cn("haptic-accordion__trigger", className)}
      {...props}
    >
      <span className="haptic-accordion__trigger-content">{children}</span>
      <motion.span
        className="haptic-accordion__chevron"
        animate={{ rotate: open ? 180 : 0 }}
        transition={springSoft}
        aria-hidden
      >
        <ChevronDownIcon />
      </motion.span>
    </button>
  )
}

type HapticAccordionContentProps = React.ComponentProps<"div">

const ItemContext = React.createContext<{ value: string } | null>(null)

function HapticAccordionContent({
  className,
  children,
  ...props
}: HapticAccordionContentProps) {
  const item = React.useContext(ItemContext)
  const { openValues } = useAccordion()
  if (!item)
    throw new Error(
      "HapticAccordionContent must be used inside HapticAccordionItem"
    )
  const open = openValues.has(item.value)
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          data-slot="haptic-accordion-content"
          data-open={open}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={springSoft}
          className="haptic-accordion__content-wrap"
        >
          <div className={cn("haptic-accordion__content", className)} {...props}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Wrap each item with ItemContext so triggers/content can read the value
const HapticAccordionItemWrapped = React.forwardRef<
  HTMLDivElement,
  HapticAccordionItemProps
>(function HapticAccordionItemWrapped(props, ref) {
  return (
    <ItemContext.Provider value={{ value: props.value }}>
      <HapticAccordionItem {...props} ref={ref} />
    </ItemContext.Provider>
  )
})

export {
  HapticAccordion,
  HapticAccordionItemWrapped as HapticAccordionItem,
  HapticAccordionTrigger,
  HapticAccordionContent,
}
