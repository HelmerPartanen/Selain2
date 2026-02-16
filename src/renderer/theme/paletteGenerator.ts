// ─── Palette Generator ───────────────────────────────────────────────────────
// Takes an extracted dominant color + mode and produces all 13 CSS color tokens.

import {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  ensureContrast,
  isLightColor
} from './contrastUtils'

export interface ThemeTokens {
  surface: string
  'surface-dim': string
  'surface-raised': string
  'surface-hover': string
  'surface-active': string
  text: string
  'text-muted': string
  'text-dim': string
  border: string
  'border-hover': string
  accent: string
  danger: string
  'glass-hover': string
}

export type ThemeMode = 'light' | 'dark'

/**
 * Auto-detect if the dominant color is light or dark.
 * Returns 'dark' or 'light' accordingly.
 */
export function autoDetectMode(dominantHex: string): ThemeMode {
  return isLightColor(dominantHex) ? 'light' : 'dark'
}

/**
 * Given a dominant/seed color and a mode, generate a full set of theme tokens.
 * The seed color tints all surfaces; text and accent are computed for contrast.
 * Saturation is preserved so the wallpaper's average color is clearly visible.
 */
export function generatePalette(seedHex: string, mode: ThemeMode): ThemeTokens {
  const [h, s] = rgbToHsl(...hexToRgb(seedHex))

  // Keep a healthy amount of the original saturation — enough to be clearly
  // visible but not so much that text becomes unreadable on the surfaces.
  // Floor at 0.08 so even grey seeds produce a faint tint rather than pure grey.
  const surfaceSat = Math.max(0.08, Math.min(s, 0.55))

  if (mode === 'dark') {
    return generateDarkPalette(h, surfaceSat, seedHex)
  }
  return generateLightPalette(h, surfaceSat, seedHex)
}

function generateDarkPalette(h: number, s: number, seedHex: string): ThemeTokens {
  // Surfaces: keep the hue & saturation clearly visible at low lightness
  const surface     = rgbToHex(...hslToRgb(h, s * 0.85, 0.12))
  const surfaceDim  = rgbToHex(...hslToRgb(h, s * 0.85, 0.09))
  const surfaceRaised = rgbToHex(...hslToRgb(h, s * 0.75, 0.17))
  const surfaceHover  = rgbToHex(...hslToRgb(h, s * 0.70, 0.22))
  const surfaceActive = rgbToHex(...hslToRgb(h, s * 0.65, 0.27))

  // Borders: slightly more saturated than surfaces for definition
  const border      = rgbToHex(...hslToRgb(h, s * 0.60, 0.20))
  const borderHover = rgbToHex(...hslToRgb(h, s * 0.60, 0.30))

  // Text: start with a seed-tinted white, then ensure contrast
  let text      = rgbToHex(...hslToRgb(h, s * 0.15, 0.93))
  let textMuted = rgbToHex(...hslToRgb(h, s * 0.12, 0.72))
  let textDim   = rgbToHex(...hslToRgb(h, s * 0.10, 0.50))
  text      = ensureContrast(text,      surface, 7)
  textMuted = ensureContrast(textMuted, surface, 4.5)
  textDim   = ensureContrast(textDim,   surface, 3)

  // Accent — vivid version of the seed color
  const [seedH, seedS] = rgbToHsl(...hexToRgb(seedHex))
  const accentSat = Math.max(seedS, 0.55)
  let accent = rgbToHex(...hslToRgb(seedH, accentSat, 0.62))
  accent = ensureContrast(accent, surface, 3)

  const danger = '#ef4444'
  const glassHover = `hsla(${Math.round(h)}, ${Math.round(s * 40)}%, 80%, 0.08)`

  return {
    surface, 'surface-dim': surfaceDim, 'surface-raised': surfaceRaised,
    'surface-hover': surfaceHover, 'surface-active': surfaceActive,
    text, 'text-muted': textMuted, 'text-dim': textDim,
    border, 'border-hover': borderHover,
    accent, danger, 'glass-hover': glassHover
  }
}

function generateLightPalette(h: number, s: number, seedHex: string): ThemeTokens {
  // Surfaces: noticeable color tint at high lightness
  const surface       = rgbToHex(...hslToRgb(h, s * 0.50, 0.94))
  const surfaceDim    = rgbToHex(...hslToRgb(h, s * 0.55, 0.90))
  const surfaceRaised = rgbToHex(...hslToRgb(h, s * 0.35, 0.97))
  const surfaceHover  = rgbToHex(...hslToRgb(h, s * 0.45, 0.87))
  const surfaceActive = rgbToHex(...hslToRgb(h, s * 0.40, 0.82))

  // Borders
  const border      = rgbToHex(...hslToRgb(h, s * 0.35, 0.82))
  const borderHover = rgbToHex(...hslToRgb(h, s * 0.40, 0.70))

  // Text: seed-tinted dark tones
  let text      = rgbToHex(...hslToRgb(h, s * 0.20, 0.12))
  let textMuted = rgbToHex(...hslToRgb(h, s * 0.15, 0.35))
  let textDim   = rgbToHex(...hslToRgb(h, s * 0.10, 0.55))
  text      = ensureContrast(text,      surface, 7)
  textMuted = ensureContrast(textMuted, surface, 4.5)
  textDim   = ensureContrast(textDim,   surface, 3)

  // Accent — deeper, richer version of seed for light backgrounds
  const [seedH, seedS] = rgbToHsl(...hexToRgb(seedHex))
  const accentSat = Math.max(seedS, 0.55)
  let accent = rgbToHex(...hslToRgb(seedH, accentSat, 0.42))
  accent = ensureContrast(accent, surface, 3)

  const danger = '#dc2626'
  const glassHover = `hsla(${Math.round(h)}, ${Math.round(s * 30)}%, 20%, 0.06)`

  return {
    surface, 'surface-dim': surfaceDim, 'surface-raised': surfaceRaised,
    'surface-hover': surfaceHover, 'surface-active': surfaceActive,
    text, 'text-muted': textMuted, 'text-dim': textDim,
    border, 'border-hover': borderHover,
    accent, danger, 'glass-hover': glassHover
  }
}

/** Default dark palette (neutral, no seed) */
export const DEFAULT_DARK_TOKENS: ThemeTokens = {
  surface: '#1e1e1e',
  'surface-dim': '#171717',
  'surface-raised': '#2a2a2a',
  'surface-hover': '#333333',
  'surface-active': '#3d3d3d',
  text: '#e4e4e7',
  'text-muted': '#a1a1aa',
  'text-dim': '#71717a',
  border: '#2e2e2e',
  'border-hover': '#404040',
  accent: '#6d8af0',
  danger: '#ef4444',
  'glass-hover': 'rgba(255, 255, 255, 0.06)'
}

/** Default light palette (neutral, no seed) */
export const DEFAULT_LIGHT_TOKENS: ThemeTokens = {
  surface: '#f5f5f5',
  'surface-dim': '#eeeeee',
  'surface-raised': '#ffffff',
  'surface-hover': '#e5e5e5',
  'surface-active': '#d4d4d4',
  text: '#1c1c1e',
  'text-muted': '#52525b',
  'text-dim': '#a1a1aa',
  border: '#e0e0e0',
  'border-hover': '#c0c0c0',
  accent: '#4a6cf7',
  danger: '#dc2626',
  'glass-hover': 'rgba(0, 0, 0, 0.05)'
}
