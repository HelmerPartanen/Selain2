// ─── Preset Wallpapers ───────────────────────────────────────────────────────
// SVG-based orb wallpapers that ship with the browser.
// Direct static versions of the onboarding ambient orb system —
// soft radial-gradient circles on a dark base, GPU-friendly.

interface WallpaperPreset {
  id: string
  name: string
  /** SVG data URL used as the wallpaper background */
  dataUrl: string
}

interface OrbPreset {
  /** Hex color */
  color: string
  /** X position as percentage string (e.g. '18%') */
  cx: string
  /** Y position as percentage string (e.g. '20%') */
  cy: string
  /** Orb diameter relative to viewport width (0–1). 0.3 = 30% of width */
  size: number
  /** Fill opacity of the radial gradient's center (0–1). Defaults to 0.4 */
  opacity?: number
}

/**
 * Generates an SVG wallpaper that replicates the onboarding's ambient orb look.
 * Each orb is a `<radialGradient>`-filled circle: solid color at center fading
 * to transparent at 70% radius — identical to the CSS `radial-gradient(circle
 * at center, color 0%, transparent 70%)` used in the onboarding.
 */
function generateOrbWallpaper(backgroundColor: string, orbs: OrbPreset[]): string {
  const gradientDefs = orbs
    .map(
      (o, i) =>
        `<radialGradient id="og${i}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${o.color}" stop-opacity="${o.opacity ?? 0.4}" />
          <stop offset="35%" stop-color="${o.color}" stop-opacity="${(o.opacity ?? 0.4) * 0.6}" />
          <stop offset="65%" stop-color="${o.color}" stop-opacity="${(o.opacity ?? 0.4) * 0.2}" />
          <stop offset="100%" stop-color="${o.color}" stop-opacity="0" />
        </radialGradient>`
    )
    .join('')

  const orbElements = orbs
    .map((o, i) => {
      const r = o.size * 100 // doubled radius for wide gradient wash
      return `<circle cx="${o.cx}" cy="${o.cy}" r="${r}%" fill="url(#og${i})" />`
    })
    .join('')

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
      <defs>${gradientDefs}</defs>
      <rect width="100%" height="100%" fill="${backgroundColor}" />
      ${orbElements}
    </svg>
  `
    .replace(/\s+/g, ' ')
    .trim()

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

// ─── Onboarding Orb Definitions (static copies) ─────────────────────────────
// Sizes are relative to viewport width: 550px on ~1920 ≈ 0.286

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  // ─── Welcome — indigo / violet / blue (onboarding step 0) ────────────
  {
    id: 'welcome_indigo',
    name: 'Indigo',
    dataUrl: generateOrbWallpaper('#0a0a14', [
      { color: '#6366f1', cx: '18%', cy: '20%', size: 0.55, opacity: 0.50 },
      { color: '#8b5cf6', cx: '76%', cy: '66%', size: 0.45, opacity: 0.45 },
      { color: '#3b82f6', cx: '54%', cy: '8%',  size: 0.38, opacity: 0.40 },
    ])
  },

  // ─── Appearance — violet / purple / pink (onboarding step 1) ─────────
  {
    id: 'appearance_violet',
    name: 'Violet',
    dataUrl: generateOrbWallpaper('#0d0614', [
      { color: '#8b5cf6', cx: '26%', cy: '32%', size: 0.52, opacity: 0.50 },
      { color: '#a855f7', cx: '72%', cy: '54%', size: 0.48, opacity: 0.45 },
      { color: '#ec4899', cx: '44%', cy: '78%', size: 0.35, opacity: 0.40 },
    ])
  },

  // ─── Privacy — emerald / teal / indigo (onboarding step 2) ───────────
  {
    id: 'privacy_emerald',
    name: 'Emerald',
    dataUrl: generateOrbWallpaper('#060e0a', [
      { color: '#10b981', cx: '22%', cy: '24%', size: 0.54, opacity: 0.50 },
      { color: '#34d399', cx: '74%', cy: '62%', size: 0.42, opacity: 0.45 },
      { color: '#6366f1', cx: '50%', cy: '14%', size: 0.36, opacity: 0.35 },
    ])
  },

  // ─── Ready — warm indigo bloom (onboarding step 3) ──────────────────
  {
    id: 'ready_bloom',
    name: 'Bloom',
    dataUrl: generateOrbWallpaper('#08061a', [
      { color: '#6366f1', cx: '34%', cy: '30%', size: 0.60, opacity: 0.50 },
      { color: '#8b5cf6', cx: '66%', cy: '52%', size: 0.50, opacity: 0.45 },
      { color: '#4f46e5', cx: '42%', cy: '72%', size: 0.40, opacity: 0.40 },
    ])
  },

  // ─── Blends — cross-step combinations ────────────────────────────────

  {
    id: 'aurora_mix',
    name: 'Aurora',
    dataUrl: generateOrbWallpaper('#060a10', [
      { color: '#10b981', cx: '20%', cy: '45%', size: 0.55, opacity: 0.48 },
      { color: '#3b82f6', cx: '55%', cy: '25%', size: 0.50, opacity: 0.42 },
      { color: '#8b5cf6', cx: '80%', cy: '60%', size: 0.44, opacity: 0.38 },
    ])
  },

  {
    id: 'nebula_mix',
    name: 'Nebula',
    dataUrl: generateOrbWallpaper('#0c0410', [
      { color: '#ec4899', cx: '65%', cy: '35%', size: 0.55, opacity: 0.48 },
      { color: '#8b5cf6', cx: '25%', cy: '55%', size: 0.50, opacity: 0.45 },
      { color: '#4f46e5', cx: '50%', cy: '15%', size: 0.40, opacity: 0.38 },
    ])
  },

  {
    id: 'twilight_mix',
    name: 'Twilight',
    dataUrl: generateOrbWallpaper('#08061a', [
      { color: '#4f46e5', cx: '30%', cy: '65%', size: 0.58, opacity: 0.48 },
      { color: '#3b82f6', cx: '65%', cy: '30%', size: 0.48, opacity: 0.42 },
      { color: '#ec4899', cx: '80%', cy: '70%', size: 0.35, opacity: 0.35 },
    ])
  },

  {
    id: 'jade_mix',
    name: 'Jade',
    dataUrl: generateOrbWallpaper('#040c0a', [
      { color: '#34d399', cx: '60%', cy: '45%', size: 0.55, opacity: 0.48 },
      { color: '#10b981', cx: '25%', cy: '30%', size: 0.50, opacity: 0.45 },
      { color: '#6366f1', cx: '70%', cy: '75%', size: 0.38, opacity: 0.35 },
    ])
  },
]

/** Preset solid colors — matched to the brand gradient palette */
export const SOLID_COLOR_PRESETS = [
  { name: 'Obsidian',      hex: '#0a0a0f' },
  { name: 'Space Black',   hex: '#1c1c1e' },
  { name: 'Deep Indigo',   hex: '#08061a' },
  { name: 'Midnight',      hex: '#050316' },
  { name: 'Deep Emerald',  hex: '#020e08' },
  { name: 'Amethyst',      hex: '#0d0618' },
  { name: 'Navy',          hex: '#020812' },
  { name: 'Graphite',      hex: '#374151' },
  { name: 'Silver',        hex: '#f2f2f7' },
  { name: 'Starlight',     hex: '#faf9f6' },
]