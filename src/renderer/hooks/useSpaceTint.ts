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
import { extractDominantHSL } from '@/utils/extractDominantHue'

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

function applyHSL(h: number, s: number, l: number, isDark: boolean): void {
  // Compose a beautiful glass palette from the extracted HSL
  // Slightly boost saturation for vibrancy
  const sat = Math.round((s * 100) * 1.08)
  const light = Math.round(l * 100)
  if (isDark) {
    setVars({
      '--glass-bg': `color-mix(in srgb, hsl(${h} ${sat}% ${light}%) 16%, rgb(30, 30, 30))`,
      '--glass-bg-heavy': `color-mix(in srgb, hsl(${h} ${sat}% ${light}%) 19%, rgb(30, 30, 30))`,
      '--glass-bg-subtle': `color-mix(in srgb, hsl(${h} ${sat}% ${Math.max(light-6,32)}%) 12%, rgb(38, 38, 38))`,
      '--border-subtle': `color-mix(in srgb, hsl(${h} ${Math.min(sat+8,48)}% ${Math.min(light+10,60)}%) 28%, rgba(255,255,255,0.07))`,
    })
  } else {
    setVars({
      '--glass-bg': `color-mix(in srgb, hsl(${h} ${sat}% ${light}%) 10%, rgb(255,255,255))`,
      '--glass-bg-heavy': `color-mix(in srgb, hsl(${h} ${sat}% ${light}%) 13%, rgb(255,255,255))`,
      '--glass-bg-subtle': `color-mix(in srgb, hsl(${h} ${sat}% ${Math.max(light-6,32)}%) 7%, rgb(245,245,245))`,
      '--border-subtle': `color-mix(in srgb, hsl(${h} ${Math.min(sat+8,48)}% ${Math.max(light-8,32)}%) 18%, rgba(0,0,0,0.07))`,
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
type HSL = { h: number; s: number; l: number }
function useAdaptiveHSL(): HSL | null {
  const [adaptive, setAdaptive] = useState<HSL | null>(null)
  const adaptiveColor = useSettingsStore((s) => s.adaptiveColor)
  const wallpaper = useThemeStore((s) => s.wallpaper)
  const wallpaperLoaded = useThemeStore((s) => s.wallpaperLoaded)
  const isDark = useIsDark()

  useEffect(() => {
    if (!adaptiveColor || !wallpaperLoaded) {
      setAdaptive(null)
      return
    }
    const url = resolveWallpaperForSampling(wallpaper, isDark)
    if (!url) {
      setAdaptive(null)
      return
    }
    let cancelled = false
    extractDominantHSL(url).then((hsl) => {
      if (!cancelled) setAdaptive(hsl)
    })
    return () => { cancelled = true }
  }, [adaptiveColor, wallpaper, wallpaperLoaded, isDark])
  return adaptive
}

export function useSpaceTint(): void {
  const spaceHue = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.hue ?? -1)
  const adaptiveHSL = useAdaptiveHSL()
  const isDark = useIsDark()

  useEffect(() => {
    if (spaceHue >= 0) {
      // Use space-specific hue, but blend with adaptive HSL for vibrancy if available
      const h = spaceHue
      const s = adaptiveHSL ? Math.max(0.22, Math.min(0.38, adaptiveHSL.s + 0.06)) : (isDark ? 0.32 : 0.28)
      const l = adaptiveHSL ? Math.max(0.36, Math.min(0.54, adaptiveHSL.l + 0.02)) : (isDark ? 0.44 : 0.48)
      applyHSL(h, s, l, isDark)
      return () => clearVars()
    }
    if (adaptiveHSL) {
      applyHSL(adaptiveHSL.h, adaptiveHSL.s, adaptiveHSL.l, isDark)
      return () => clearVars()
    }
    clearVars()
    return () => {}
  }, [spaceHue, adaptiveHSL, isDark])
}
