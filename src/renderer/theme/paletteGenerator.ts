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
 */
export function generatePalette(seedHex: string, mode: ThemeMode): ThemeTokens {
  const [h, s] = rgbToHsl(...hexToRgb(seedHex))

  // Clamp saturation so the surfaces aren't neon
  const surfaceSat = Math.min(s, 0.35)

  if (mode === 'dark') {
    return generateDarkPalette(h, surfaceSat, seedHex)
  }
  return generateLightPalette(h, surfaceSat, seedHex)
}

function generateDarkPalette(h: number, s: number, seedHex: string): ThemeTokens {
  const surface = rgbToHex(...hslToRgb(h, s * 0.5, 0.11))
  const surfaceDim = rgbToHex(...hslToRgb(h, s * 0.5, 0.08))
  const surfaceRaised = rgbToHex(...hslToRgb(h, s * 0.45, 0.15))
  const surfaceHover = rgbToHex(...hslToRgb(h, s * 0.4, 0.19))
  const surfaceActive = rgbToHex(...hslToRgb(h, s * 0.4, 0.23))
  const border = rgbToHex(...hslToRgb(h, s * 0.3, 0.17))
  const borderHover = rgbToHex(...hslToRgb(h, s * 0.3, 0.25))

  // Text — white-ish, ensure contrast
  let text = '#e4e4e7'
  let textMuted = '#a1a1aa'
  let textDim = '#71717a'
  text = ensureContrast(text, surface, 7)
  textMuted = ensureContrast(textMuted, surface, 4.5)
  textDim = ensureContrast(textDim, surface, 3)

  // Accent — use seed hue at higher saturation & mid lightness
  const [seedH, seedS] = rgbToHsl(...hexToRgb(seedHex))
  const accentSat = Math.max(seedS, 0.5)
  let accent = rgbToHex(...hslToRgb(seedH, accentSat, 0.6))
  accent = ensureContrast(accent, surface, 3)

  // Danger — warm red, still tinted
  const danger = '#ef4444'

  // Glass hover
  const glassHover = 'rgba(255, 255, 255, 0.06)'

  return {
    surface,
    'surface-dim': surfaceDim,
    'surface-raised': surfaceRaised,
    'surface-hover': surfaceHover,
    'surface-active': surfaceActive,
    text,
    'text-muted': textMuted,
    'text-dim': textDim,
    border,
    'border-hover': borderHover,
    accent,
    danger,
    'glass-hover': glassHover
  }
}

function generateLightPalette(h: number, s: number, seedHex: string): ThemeTokens {
  const surface = rgbToHex(...hslToRgb(h, s * 0.3, 0.96))
  const surfaceDim = rgbToHex(...hslToRgb(h, s * 0.3, 0.93))
  const surfaceRaised = rgbToHex(...hslToRgb(h, s * 0.25, 0.99))
  const surfaceHover = rgbToHex(...hslToRgb(h, s * 0.2, 0.90))
  const surfaceActive = rgbToHex(...hslToRgb(h, s * 0.2, 0.85))
  const border = rgbToHex(...hslToRgb(h, s * 0.2, 0.87))
  const borderHover = rgbToHex(...hslToRgb(h, s * 0.25, 0.75))

  // Dark text for light backgrounds
  let text = '#1c1c1e'
  let textMuted = '#52525b'
  let textDim = '#a1a1aa'
  text = ensureContrast(text, surface, 7)
  textMuted = ensureContrast(textMuted, surface, 4.5)
  textDim = ensureContrast(textDim, surface, 3)

  // Accent — use seed hue at medium saturation & slightly darker for contrast on light bg
  const [seedH, seedS] = rgbToHsl(...hexToRgb(seedHex))
  const accentSat = Math.max(seedS, 0.5)
  let accent = rgbToHex(...hslToRgb(seedH, accentSat, 0.45))
  accent = ensureContrast(accent, surface, 3)

  const danger = '#dc2626'
  const glassHover = 'rgba(0, 0, 0, 0.05)'

  return {
    surface,
    'surface-dim': surfaceDim,
    'surface-raised': surfaceRaised,
    'surface-hover': surfaceHover,
    'surface-active': surfaceActive,
    text,
    'text-muted': textMuted,
    'text-dim': textDim,
    border,
    'border-hover': borderHover,
    accent,
    danger,
    'glass-hover': glassHover
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
