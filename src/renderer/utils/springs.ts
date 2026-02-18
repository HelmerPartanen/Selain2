// ─── Motion Tokens ────────────────────────────────────────────────────────────
// Canonical spring configurations used throughout the browser UI.
// Import from here instead of defining local constants in each component.
//
// Hierarchy:
//   SPRING        — panels, modals, large surface entries (400/28/0.8)
//   SPRING_POPUP  — dropdowns, menus, small popovers     (420/26/0.7)
//   SPRING_FAST   — tight micro-interactions, icon swaps (500/26/0.6)
//   SPRING_GENTLE — ambient reveals, bar show/hide       (220/26/1.0)
//   SPRING_EXPAND — pill/bar width expansion             (340/32/0.9)
//   SPRING_ORB    — slow ambient background orbs         (30/20/2.5)

type SpringConfig = {
  type: 'spring'
  stiffness: number
  damping: number
  mass: number
}

/** Panels, modals, large cards — bottom-up cinematic entry */
export const SPRING: SpringConfig = { type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }

/** Dropdowns, context menus, popovers — snappy upward pop */
export const SPRING_POPUP: SpringConfig = { type: 'spring', stiffness: 420, damping: 26, mass: 0.7 }

/** Micro-interactions — icon crossfades, badge pops, small quick transitions */
export const SPRING_FAST: SpringConfig = { type: 'spring', stiffness: 500, damping: 26, mass: 0.6 }

/** Ambient reveals — floating bar show/hide, soft slide-ins */
export const SPRING_GENTLE: SpringConfig = { type: 'spring', stiffness: 220, damping: 26, mass: 1.0 }

/** Pill/bar width expansion — smooth but not too fast */
export const SPRING_EXPAND: SpringConfig = { type: 'spring', stiffness: 340, damping: 32, mass: 0.9 }

/** Ambient orb drift — intentionally slow and heavy */
export const SPRING_ORB: SpringConfig = { type: 'spring', stiffness: 30, damping: 20, mass: 2.5 }
