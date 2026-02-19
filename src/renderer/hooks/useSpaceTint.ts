// ─── useSpaceTint ────────────────────────────────────────────────────────────
// Applies the active space's color tint to the global glass CSS custom properties.
// This tints all glass/glass-heavy/glass-subtle surfaces uniformly — floating bar,
// menus, popups, window controls — without touching individual components.

import { useEffect } from 'react'
import { useSpaceStore } from '@/store/spaceStore'
import { useIsDark } from '@/hooks/useIsDark'

const root = document.documentElement

// Default (untinted) values — must match main.css :root / .dark
const LIGHT_DEFAULTS = {
  '--glass-bg': 'rgb(255, 255, 255)',
  '--glass-bg-heavy': 'rgb(255, 255, 255)',
  '--glass-bg-subtle': 'rgb(245, 245, 245)',
  '--border-subtle': 'rgba(0, 0, 0, 0.06)',
} as const

const DARK_DEFAULTS = {
  '--glass-bg': 'rgb(30, 30, 30)',
  '--glass-bg-heavy': 'rgb(30, 30, 30)',
  '--glass-bg-subtle': 'rgb(38, 38, 38)',
  '--border-subtle': 'rgba(255, 255, 255, 0.06)',
} as const

function setVars(vars: Record<string, string>): void {
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v)
  }
}

function clearVars(): void {
  root.style.removeProperty('--glass-bg')
  root.style.removeProperty('--glass-bg-heavy')
  root.style.removeProperty('--glass-bg-subtle')
  root.style.removeProperty('--border-subtle')
}

export function useSpaceTint(): void {
  const hue = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.hue ?? -1)
  const isDark = useIsDark()

  useEffect(() => {
    if (hue < 0) {
      // Restore defaults by removing inline overrides (CSS classes take over)
      clearVars()
      return
    }

    if (isDark) {
      setVars({
        '--glass-bg': `color-mix(in srgb, hsl(${hue} 45% 45%) 12%, rgb(30, 30, 30))`,
        '--glass-bg-heavy': `color-mix(in srgb, hsl(${hue} 45% 45%) 14%, rgb(30, 30, 30))`,
        '--glass-bg-subtle': `color-mix(in srgb, hsl(${hue} 45% 45%) 10%, rgb(38, 38, 38))`,
        '--border-subtle': `color-mix(in srgb, hsl(${hue} 50% 55%) 25%, rgba(255, 255, 255, 0.06))`,
      })
    } else {
      setVars({
        '--glass-bg': `color-mix(in srgb, hsl(${hue} 55% 60%) 8%, rgb(255, 255, 255))`,
        '--glass-bg-heavy': `color-mix(in srgb, hsl(${hue} 55% 60%) 10%, rgb(255, 255, 255))`,
        '--glass-bg-subtle': `color-mix(in srgb, hsl(${hue} 55% 60%) 6%, rgb(245, 245, 245))`,
        '--border-subtle': `color-mix(in srgb, hsl(${hue} 60% 55%) 20%, rgba(0, 0, 0, 0.06))`,
      })
    }

    return () => clearVars()
  }, [hue, isDark])
}
