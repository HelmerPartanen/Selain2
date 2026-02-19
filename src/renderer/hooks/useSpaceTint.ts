// ─── useSpaceTint ────────────────────────────────────────────────────────────
// Applies a color tint to the global glass CSS custom properties.
// Priority: space hue > adaptive wallpaper color > no tint.
// This tints all glass/glass-heavy/glass-subtle surfaces uniformly — floating bar,
// menus, popups, window controls — without touching individual components.

import { useEffect, useState } from 'react'
import { useSpaceStore } from '@/store/spaceStore'
import { useThemeStore } from '@/store/themeStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useIsDark } from '@/hooks/useIsDark'
import { resolveWallpaperUrl } from '@/theme/bundledWallpapers'
import { isPresetKey, resolvePresetUrl } from '@/theme/presets'
import { extractDominantHue } from '@/utils/extractDominantHue'

const root = document.documentElement

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

function applyHue(hue: number, isDark: boolean): void {
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
}

/**
 * Resolve the wallpaper store value to a usable URL for color extraction.
 */
function resolveWallpaperForSampling(wallpaper: string | null, isDark: boolean): string | null {
  if (!wallpaper) return null
  if (isPresetKey(wallpaper)) return resolvePresetUrl(wallpaper, isDark)
  return resolveWallpaperUrl(wallpaper)
}

/**
 * Hook that extracts the dominant hue from the current wallpaper.
 * Returns -1 when adaptive color is off, no wallpaper, or image is achromatic.
 */
function useAdaptiveHue(): number {
  const [adaptiveHue, setAdaptiveHue] = useState(-1)
  const adaptiveColor = useSettingsStore((s) => s.adaptiveColor)
  const wallpaper = useThemeStore((s) => s.wallpaper)
  const wallpaperLoaded = useThemeStore((s) => s.wallpaperLoaded)
  const isDark = useIsDark()

  useEffect(() => {
    if (!adaptiveColor || !wallpaperLoaded) {
      setAdaptiveHue(-1)
      return
    }

    const url = resolveWallpaperForSampling(wallpaper, isDark)
    if (!url) {
      setAdaptiveHue(-1)
      return
    }

    let cancelled = false
    extractDominantHue(url).then((hue) => {
      if (!cancelled) setAdaptiveHue(hue)
    })

    return () => { cancelled = true }
  }, [adaptiveColor, wallpaper, wallpaperLoaded, isDark])

  return adaptiveHue
}

export function useSpaceTint(): void {
  const spaceHue = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.hue ?? -1)
  const adaptiveHue = useAdaptiveHue()
  const isDark = useIsDark()

  // Space hue takes priority; adaptive hue is a fallback
  const effectiveHue = spaceHue >= 0 ? spaceHue : adaptiveHue

  useEffect(() => {
    if (effectiveHue < 0) {
      clearVars()
      return
    }

    applyHue(effectiveHue, isDark)
    return () => clearVars()
  }, [effectiveHue, isDark])
}
