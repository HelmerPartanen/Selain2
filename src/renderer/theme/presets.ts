// ─── Preset Wallpapers ───────────────────────────────────────────────────────
// SVG-based mesh wallpapers that ship with the browser.
// Designed to mimic high-end Apple/iOS aesthetics.

export interface WallpaperPreset {
  id: string
  name: string
  /** SVG data URL used as the wallpaper background */
  dataUrl: string
}

interface Orb {
  color: string
  cx: string // Percentage (e.g., '20%')
  cy: string // Percentage (e.g., '30%')
  r: string  // Percentage (e.g., '50%')
  opacity?: number
}

/**
 * Generates a "Mesh" gradient using SVG filters.
 * High blur values create the "ethereal" Apple-like look.
 */
function generateMeshWallpaper(backgroundColor: string, orbs: Orb[]): string {
  // A very high blur ensures the shapes merge into a seamless mesh
  const filterId = 'mesh-blur'
  
  const orbElements = orbs
    .map(
      (o) =>
        `<circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="${o.color}" fill-opacity="${o.opacity ?? 1}" filter="url(#${filterId})" />`
    )
    .join('')

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="180" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="${backgroundColor}" />
      ${orbElements}
    </svg>
  `
    .replace(/\s+/g, ' ')
    .trim()

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'titanium',
    name: 'Natural Titanium',
    dataUrl: generateMeshWallpaper('#8e8e93', [
      { color: '#b5b5b9', cx: '10%', cy: '10%', r: '80%' },
      { color: '#d1d1d6', cx: '90%', cy: '90%', r: '60%' },
      { color: '#e5e5ea', cx: '50%', cy: '50%', r: '40%', opacity: 0.6 },
      { color: '#636366', cx: '80%', cy: '20%', r: '30%', opacity: 0.4 }
    ])
  },
  {
    id: 'deep_blue',
    name: 'Deep Blue',
    dataUrl: generateMeshWallpaper('#020617', [
      { color: '#172554', cx: '20%', cy: '80%', r: '70%' },
      { color: '#1e3a8a', cx: '80%', cy: '0%', r: '60%' },
      { color: '#1e40af', cx: '50%', cy: '50%', r: '45%', opacity: 0.5 },
      { color: '#60a5fa', cx: '90%', cy: '90%', r: '30%', opacity: 0.2 } // Subtle highlight
    ])
  },
  {
    id: 'california',
    name: 'California',
    dataUrl: generateMeshWallpaper('#fff7ed', [
      { color: '#ffedd5', cx: '0%', cy: '0%', r: '90%' },
      { color: '#fed7aa', cx: '100%', cy: '100%', r: '60%' },
      { color: '#fbcfe8', cx: '50%', cy: '40%', r: '50%', opacity: 0.6 }, // Soft pink
      { color: '#fca5a5', cx: '80%', cy: '20%', r: '35%', opacity: 0.4 }  // Warm peach
    ])
  },
  {
    id: 'euphoria',
    name: 'Euphoria',
    dataUrl: generateMeshWallpaper('#f5f3ff', [
      { color: '#ddd6fe', cx: '10%', cy: '90%', r: '70%' },
      { color: '#c4b5fd', cx: '90%', cy: '10%', r: '60%' },
      { color: '#a78bfa', cx: '50%', cy: '50%', r: '50%', opacity: 0.4 },
      { color: '#67e8f9', cx: '20%', cy: '20%', r: '40%', opacity: 0.3 }  // Cyan hint
    ])
  },
  {
    id: 'forest_pro',
    name: 'Alpine Green',
    dataUrl: generateMeshWallpaper('#022c22', [
      { color: '#064e3b', cx: '0%', cy: '100%', r: '80%' },
      { color: '#065f46', cx: '100%', cy: '0%', r: '70%' },
      { color: '#10b981', cx: '50%', cy: '50%', r: '40%', opacity: 0.3 }, // Emerald glow
      { color: '#34d399', cx: '20%', cy: '30%', r: '25%', opacity: 0.2 }
    ])
  },
  {
    id: 'midnight_air',
    name: 'Midnight Air',
    dataUrl: generateMeshWallpaper('#000000', [
      { color: '#1e1b4b', cx: '50%', cy: '100%', r: '80%', opacity: 0.8 },
      { color: '#312e81', cx: '0%', cy: '0%', r: '70%', opacity: 0.6 },
      { color: '#4338ca', cx: '80%', cy: '30%', r: '40%', opacity: 0.3 }
    ])
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    dataUrl: generateMeshWallpaper('#451a03', [
      { color: '#78350f', cx: '0%', cy: '100%', r: '70%' },
      { color: '#b45309', cx: '100%', cy: '0%', r: '60%' },
      { color: '#fbbf24', cx: '40%', cy: '40%', r: '40%', opacity: 0.5 },
      { color: '#fef3c7', cx: '80%', cy: '20%', r: '20%', opacity: 0.4 } // Bright sun spot
    ])
  },
  {
    id: 'rose_gold',
    name: 'Rose Gold',
    dataUrl: generateMeshWallpaper('#881337', [
      { color: '#9f1239', cx: '0%', cy: '0%', r: '80%' },
      { color: '#be123c', cx: '100%', cy: '100%', r: '70%' },
      { color: '#fda4af', cx: '50%', cy: '50%', r: '45%', opacity: 0.4 }, // Pink highlight
      { color: '#fb7185', cx: '20%', cy: '80%', r: '30%', opacity: 0.3 }
    ])
  }
]

/** Preset solid colors for quick selection */
export const SOLID_COLOR_PRESETS = [
  { name: 'Graphite', hex: '#1C1C1E' },
  { name: 'Midnight', hex: '#1A1A2E' },
  { name: 'Pacific Blue', hex: '#1e3a8a' },
  { name: 'Alpine', hex: '#1A2E1A' },
  { name: 'Burgundy', hex: '#4a044e' },
  { name: 'Slate', hex: '#334155' },
  { name: 'Silver', hex: '#F2F2F7' },
  { name: 'Starlight', hex: '#FAF9F6' },
  { name: 'Sky', hex: '#e0f2fe' },
  { name: 'Mint', hex: '#ecfdf5' }
]