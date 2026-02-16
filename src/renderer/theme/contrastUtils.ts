// ─── Color Contrast & Conversion Utilities ──────────────────────────────────

/** Parse a hex color string (#RRGGBB or #RGB) to [r, g, b] (0-255) */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3
    ? h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!
    : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16)
  ]
}

/** Convert [r, g, b] (0-255) to a #RRGGBB hex string */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return '#' + [r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')
}

/** Convert [r,g,b] (0-255) to [h,s,l] where h is 0-360, s and l are 0-1 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h * 360, s, l]
}

/** Convert [h,s,l] (h: 0-360, s: 0-1, l: 0-1) to [r,g,b] (0-255) */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  ]
}

/** Compute relative luminance (WCAG 2.1) for [r,g,b] 0-255 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!
}

/** WCAG contrast ratio between two colors (each as [r,g,b] 0-255) */
export function contrastRatio(
  [r1, g1, b1]: [number, number, number],
  [r2, g2, b2]: [number, number, number]
): number {
  const l1 = relativeLuminance(r1, g1, b1)
  const l2 = relativeLuminance(r2, g2, b2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Nudge a foreground color's lightness until it meets minRatio 
 * contrast against the given background. Returns a new hex color.
 */
export function ensureContrast(fgHex: string, bgHex: string, minRatio = 4.5): string {
  const bg = hexToRgb(bgHex)
  let fg = hexToRgb(fgHex)
  let ratio = contrastRatio(fg, bg)
  if (ratio >= minRatio) return fgHex

  const [h, s, l] = rgbToHsl(...fg)
  const bgLum = relativeLuminance(...bg)
  // Determine if we should lighten or darken the foreground
  const direction = bgLum > 0.5 ? -1 : 1

  let newL = l
  for (let i = 0; i < 100; i++) {
    newL += direction * 0.01
    newL = Math.max(0, Math.min(1, newL))
    fg = hslToRgb(h, s, newL)
    ratio = contrastRatio(fg, bg)
    if (ratio >= minRatio) break
  }

  return rgbToHex(...fg)
}

/** Determine if a color is perceived as "light" */
export function isLightColor(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex)
  return relativeLuminance(r, g, b) > 0.179
}
