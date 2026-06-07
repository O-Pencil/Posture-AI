import type { Transition } from "motion/react"

import { HAPTIC_ELEVATION, HAPTIC_GRADIENTS } from "./tokens"

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 34,
  mass: 0.75,
}

export const springSoft: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 28,
  mass: 0.9,
}

export const tweenSurface: Transition = {
  duration: 0.18,
  ease: [0.25, 0.1, 0.25, 1],
}

export const HAPTIC_GRADIENT = {
  selected: HAPTIC_GRADIENTS.selected,
  unselected: HAPTIC_GRADIENTS.neutral,
  thumb: HAPTIC_GRADIENTS.thumb,
} as const

export { HAPTIC_ELEVATION }
