// ─── Preset Wallpapers ───────────────────────────────────────────────────────
// Small SVG-based gradient wallpapers that ship with the browser.
// Each has a name, thumbnail (same SVG), and dominant color for palette generation.

export interface WallpaperPreset {
  id: string
  name: string
  /** SVG data URL used as the wallpaper background */
  dataUrl: string
}

function svgGradient(id: string, colors: string[], angle = 135): string {
  const stops = colors
    .map((c, i) => `<stop offset="${(i / (colors.length - 1)) * 100}%" stop-color="${c}"/>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="g" gradientTransform="rotate(${angle})">${stops}</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

function svgRadialGradient(colors: string[]): string {
  const stops = colors
    .map((c, i) => `<stop offset="${(i / (colors.length - 1)) * 100}%" stop-color="${c}"/>`)
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><radialGradient id="g" cx="50%" cy="50%" r="70%">${stops}</radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    dataUrl: svgGradient('aurora', ['#0f2027', '#1a6b4a', '#2c5364'], 135)
  },
  {
    id: 'sunset',
    name: 'Sunset',
    dataUrl: svgGradient('sunset', ['#2c1654', '#c0392b', '#f39c12'], 135)
  },
  {
    id: 'ocean',
    name: 'Ocean',
    dataUrl: svgGradient('ocean', ['#0c2340', '#2980b9', '#6dd5fa'], 160)
  },
  {
    id: 'lavender',
    name: 'Lavender',
    dataUrl: svgGradient('lavender', ['#1a1033', '#7c3aed', '#c084fc'], 120)
  },
  {
    id: 'forest',
    name: 'Forest',
    dataUrl: svgGradient('forest', ['#1b2a1b', '#2d6a4f', '#95d5b2'], 145)
  },
  {
    id: 'rose',
    name: 'Rosé',
    dataUrl: svgRadialGradient(['#fda4af', '#e11d48', '#4a0519'])
  },
  {
    id: 'midnight',
    name: 'Midnight',
    dataUrl: svgGradient('midnight', ['#0a0a1a', '#1e3a5f', '#0a0a1a'], 180)
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    dataUrl: svgGradient('golden', ['#451a03', '#d97706', '#fef3c7'], 135)
  }
]

/** Preset solid colors for quick selection */
export const SOLID_COLOR_PRESETS = [
  { name: 'Charcoal', hex: '#1e1e1e' },
  { name: 'Midnight Blue', hex: '#1a1a2e' },
  { name: 'Deep Purple', hex: '#2d1b4e' },
  { name: 'Dark Teal', hex: '#0d2f2f' },
  { name: 'Forest', hex: '#1a2e1a' },
  { name: 'Wine', hex: '#3b1a2e' },
  { name: 'Navy', hex: '#0a1628' },
  { name: 'Slate', hex: '#2e3440' },
  { name: 'Snow', hex: '#f0f0f5' },
  { name: 'Cream', hex: '#faf5ee' },
  { name: 'Ice Blue', hex: '#e8f0fe' },
  { name: 'Mint', hex: '#ecfdf5' }
]
