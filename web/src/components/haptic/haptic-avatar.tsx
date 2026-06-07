import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const hapticAvatarVariants = cva("haptic-avatar", {
  variants: {
    size: {
      smaller: "haptic-avatar--size-smaller",
      default: "haptic-avatar--size-default",
      bigger: "haptic-avatar--size-bigger",
      huge: "haptic-avatar--size-huge",
    },
    ring: {
      none: "haptic-avatar--ring-none",
      metal: "haptic-avatar--ring-metal",
      gold: "haptic-avatar--ring-gold",
    },
    status: {
      none: "haptic-avatar--status-none",
      online: "haptic-avatar--status-online",
      busy: "haptic-avatar--status-busy",
      away: "haptic-avatar--status-away",
    },
  },
  defaultVariants: {
    size: "default",
    ring: "metal",
    status: "none",
  },
})

type HapticAvatarProps = React.ComponentProps<"div"> &
  VariantProps<typeof hapticAvatarVariants> & {
    src?: string
    alt?: string
    initials?: string
    name?: string
  }

function getInitials(name?: string): string {
  if (!name) return "?"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")
}

function HapticAvatar({
  className,
  size = "default",
  ring = "metal",
  status = "none",
  src,
  alt = "",
  initials,
  name,
  children,
  style,
  ...props
}: HapticAvatarProps) {
  const displayInitials = initials ?? getInitials(name)

  return (
    <div
      data-slot="haptic-avatar"
      data-size={size}
      data-ring={ring}
      data-status={status}
      className={cn(hapticAvatarVariants({ size, ring, status }), className)}
      style={style}
      {...props}
    >
      <div className="haptic-avatar__ring" aria-hidden />
      <div className="haptic-avatar__inner">
        {src ? (
          <img src={src} alt={alt} className="haptic-avatar__image" />
        ) : children ? (
          children
        ) : (
          <span className="haptic-avatar__initials">{displayInitials}</span>
        )}
      </div>
      {status !== "none" && (
        <span className="haptic-avatar__status" aria-hidden />
      )}
    </div>
  )
}

export { HapticAvatar, hapticAvatarVariants }
