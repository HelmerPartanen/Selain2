// ─── Preset Wallpapers ───────────────────────────────────────────────────────
// SVG-based mesh wallpapers that ship with the browser.
// Designed to match macOS default wallpaper aesthetics — deep, luminous,
// and compositionally balanced with volumetric light diffusion.

interface WallpaperPreset {
  id: string
  name: string
  /** SVG data URL used as the wallpaper background */
  dataUrl: string
}

interface Orb {
  color: string
  cx: string   // Percentage (e.g., '20%')
  cy: string   // Percentage (e.g., '30%')
  r: string    // Percentage (e.g., '50%')
  opacity?: number
  /**
   * Per-orb blur override. Smaller values = sharper,
   * larger = more diffuse. Defaults to 180.
   * Use lower values for bright "light source" orbs and
   * higher values for wide ambient fill orbs.
   */
  blur?: number
}

/**
 * Generates a layered mesh gradient using SVG filters.
 * Supports per-orb blur for multi-depth volumetric lighting.
 */
function generateMeshWallpaper(backgroundColor: string, orbs: Orb[]): string {
  // Build unique filter IDs per distinct blur value
  const blurMap = new Map<number, string>()
  orbs.forEach((o) => {
    const b = o.blur ?? 180
    if (!blurMap.has(b)) {
      blurMap.set(b, `mesh-blur-${b}`)
    }
  })

  const filterDefs = Array.from(blurMap.entries())
    .map(
      ([stdDev, id]) =>
        `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="${stdDev}" />
        </filter>`
    )
    .join('')

  const orbElements = orbs
    .map((o) => {
      const filterId = blurMap.get(o.blur ?? 180)!
      return `<circle cx="${o.cx}" cy="${o.cy}" r="${o.r}" fill="${o.color}" fill-opacity="${o.opacity ?? 1}" filter="url(#${filterId})" />`
    })
    .join('')

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" preserveAspectRatio="xMidYMid slice">
      <defs>${filterDefs}</defs>
      <rect width="100%" height="100%" fill="${backgroundColor}" />
      ${orbElements}
    </svg>
  `
    .replace(/\s+/g, ' ')
    .trim()

  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  // ─── macOS Sonoma · Golden Hour ──────────────────────────────────────────
  // Warm amber light spilling over dark terrain — the quintessential
  // Sonoma rolling-hills dusk palette.
  {
    id: 'sonoma_gold',
    name: 'Sonoma Gold',
    dataUrl: generateMeshWallpaper('#140a00', [
      { color: '#78350f', cx: '0%',   cy: '100%', r: '90%',  opacity: 1,   blur: 220 }, // Deep amber base fill
      { color: '#b45309', cx: '70%',  cy: '60%',  r: '65%',  opacity: 0.9, blur: 160 }, // Mid amber body
      { color: '#f59e0b', cx: '80%',  cy: '10%',  r: '50%',  opacity: 0.7, blur: 120 }, // Warm gold bloom upper-right
      { color: '#fde68a', cx: '85%',  cy: '5%',   r: '25%',  opacity: 0.5, blur: 80  }, // Bright sun point
      { color: '#fca5a5', cx: '50%',  cy: '30%',  r: '35%',  opacity: 0.2, blur: 140 }, // Subtle rose horizon
      { color: '#1c0a00', cx: '10%',  cy: '20%',  r: '50%',  opacity: 0.8, blur: 200 }, // Dark shadow corner
    ])
  },

  // ─── macOS Monterey · Pacific Depth ──────────────────────────────────────
  // Coastal deep navy bleeding into luminous cyan — the Monterey
  // signature gradient distilled.
  {
    id: 'monterey_pacific',
    name: 'Monterey Pacific',
    dataUrl: generateMeshWallpaper('#020c1b', [
      { color: '#0c2461', cx: '0%',   cy: '100%', r: '90%',  opacity: 1,   blur: 220 }, // Deep ocean base
      { color: '#1a56db', cx: '60%',  cy: '40%',  r: '70%',  opacity: 0.8, blur: 170 }, // Blue mid-field
      { color: '#0891b2', cx: '85%',  cy: '20%',  r: '45%',  opacity: 0.6, blur: 110 }, // Cyan bloom
      { color: '#22d3ee', cx: '90%',  cy: '10%',  r: '22%',  opacity: 0.45,blur: 70  }, // Bright cyan light source
      { color: '#1e3a8a', cx: '20%',  cy: '30%',  r: '55%',  opacity: 0.5, blur: 190 }, // Wide indigo wash
      { color: '#0f172a', cx: '5%',   cy: '5%',   r: '40%',  opacity: 0.9, blur: 160 }, // Dark top-left shadow
    ])
  },

  // ─── macOS Ventura · Ember ────────────────────────────────────────────────
  // Volcanic dark base ignited by ember-orange and deep crimson —
  // the Ventura 3D-sphere lighting palette translated to mesh.
  {
    id: 'ventura_ember',
    name: 'Ventura Ember',
    dataUrl: generateMeshWallpaper('#0a0500', [
      { color: '#1c0a00', cx: '50%',  cy: '100%', r: '100%', opacity: 1,   blur: 230 }, // Base shadow fill
      { color: '#7c2d12', cx: '30%',  cy: '70%',  r: '70%',  opacity: 0.9, blur: 180 }, // Deep ember body
      { color: '#c2410c', cx: '65%',  cy: '35%',  r: '55%',  opacity: 0.8, blur: 130 }, // Orange core
      { color: '#f97316', cx: '75%',  cy: '15%',  r: '35%',  opacity: 0.6, blur: 90  }, // Bright flame bloom
      { color: '#fef08a', cx: '80%',  cy: '8%',   r: '18%',  opacity: 0.3, blur: 60  }, // Hot tip highlight
      { color: '#9f1239', cx: '15%',  cy: '40%',  r: '45%',  opacity: 0.4, blur: 150 }, // Crimson shadow fill
    ])
  },

  // ─── macOS Sequoia · Forest Dawn ─────────────────────────────────────────
  // Pre-sunrise forest — ink-black canopy warming toward a single
  // golden light break on the horizon.
  {
    id: 'sequoia_dawn',
    name: 'Sequoia Dawn',
    dataUrl: generateMeshWallpaper('#010f06', [
      { color: '#052e16', cx: '0%',   cy: '100%', r: '90%',  opacity: 1,   blur: 220 }, // Deep forest base
      { color: '#14532d', cx: '40%',  cy: '60%',  r: '70%',  opacity: 0.9, blur: 180 }, // Forest green body
      { color: '#059669', cx: '70%',  cy: '30%',  r: '45%',  opacity: 0.6, blur: 130 }, // Emerald glow
      { color: '#d97706', cx: '75%',  cy: '55%',  r: '35%',  opacity: 0.4, blur: 110 }, // Golden horizon break
      { color: '#fde68a', cx: '78%',  cy: '58%',  r: '15%',  opacity: 0.25,blur: 70  }, // Bright dawn point
      { color: '#0d9488', cx: '20%',  cy: '20%',  r: '50%',  opacity: 0.3, blur: 200 }, // Cool teal canopy
    ])
  },

  // ─── macOS Big Sur · Twilight Cliffs ────────────────────────────────────
  // The iconic Big Sur palette — deep violet ocean meeting a
  // magenta-to-gold coastal sky.
  {
    id: 'big_sur_twilight',
    name: 'Big Sur Twilight',
    dataUrl: generateMeshWallpaper('#0d0020', [
      { color: '#2e1065', cx: '50%',  cy: '100%', r: '90%',  opacity: 1,   blur: 230 }, // Deep violet base
      { color: '#6d28d9', cx: '20%',  cy: '60%',  r: '65%',  opacity: 0.7, blur: 170 }, // Purple body
      { color: '#be185d', cx: '75%',  cy: '40%',  r: '55%',  opacity: 0.6, blur: 130 }, // Magenta coast
      { color: '#f43f5e', cx: '65%',  cy: '20%',  r: '35%',  opacity: 0.5, blur: 100 }, // Rose bloom
      { color: '#fb923c', cx: '80%',  cy: '10%',  r: '25%',  opacity: 0.45,blur: 75  }, // Orange horizon
      { color: '#fde68a', cx: '85%',  cy: '5%',   r: '14%',  opacity: 0.3, blur: 55  }, // Gold sun
    ])
  },

  // ─── macOS Sonoma · Midnight Lavender ────────────────────────────────────
  // Deep night sky — cool indigo with a whisper of lavender light,
  // as if moonrise over the hills.
  {
    id: 'sonoma_midnight',
    name: 'Sonoma Midnight',
    dataUrl: generateMeshWallpaper('#06040f', [
      { color: '#1e1b4b', cx: '50%',  cy: '100%', r: '90%',  opacity: 1,   blur: 230 }, // Indigo base
      { color: '#3730a3', cx: '80%',  cy: '70%',  r: '65%',  opacity: 0.7, blur: 180 }, // Deep blue body
      { color: '#7c3aed', cx: '30%',  cy: '30%',  r: '55%',  opacity: 0.5, blur: 150 }, // Violet wash
      { color: '#a78bfa', cx: '40%',  cy: '15%',  r: '35%',  opacity: 0.4, blur: 100 }, // Lavender bloom
      { color: '#ddd6fe', cx: '38%',  cy: '10%',  r: '16%',  opacity: 0.2, blur: 70  }, // Moonlight point
      { color: '#0f0a1e', cx: '85%',  cy: '10%',  r: '45%',  opacity: 0.9, blur: 160 }, // Dark corner
    ])
  },

  // ─── macOS Catalina · Deep Ocean ────────────────────────────────────────
  // Abyssal navy with cool steel-blue shimmer — clear Pacific
  // looking down into the water column.
  {
    id: 'catalina_deep',
    name: 'Catalina Deep',
    dataUrl: generateMeshWallpaper('#000810', [
      { color: '#0c1a35', cx: '30%',  cy: '80%',  r: '90%',  opacity: 1,   blur: 220 }, // Abyssal base
      { color: '#1e3a8a', cx: '70%',  cy: '50%',  r: '70%',  opacity: 0.8, blur: 170 }, // Navy body
      { color: '#0369a1', cx: '80%',  cy: '20%',  r: '50%',  opacity: 0.6, blur: 120 }, // Steel-blue bloom
      { color: '#38bdf8', cx: '85%',  cy: '8%',   r: '25%',  opacity: 0.4, blur: 80  }, // Sky-blue highlight
      { color: '#7dd3fc', cx: '88%',  cy: '3%',   r: '12%',  opacity: 0.25,blur: 50  }, // Bright surface glint
      { color: '#0f172a', cx: '10%',  cy: '15%',  r: '55%',  opacity: 0.9, blur: 190 }, // Dark shadow quadrant
    ])
  },

  // ─── macOS Mojave · Desert Storm ────────────────────────────────────────
  // The Mojave night-to-dusk transition: plum shadow with a bruised
  // orange sunset slicing through the dark.
  {
    id: 'mojave_desert',
    name: 'Mojave Desert',
    dataUrl: generateMeshWallpaper('#0f0500', [
      { color: '#3b0764', cx: '10%',  cy: '10%',  r: '80%',  opacity: 0.9, blur: 220 }, // Deep plum shadow
      { color: '#7e22ce', cx: '0%',   cy: '50%',  r: '60%',  opacity: 0.6, blur: 160 }, // Purple mid-field
      { color: '#c2410c', cx: '60%',  cy: '60%',  r: '60%',  opacity: 0.7, blur: 150 }, // Burnt orange body
      { color: '#ea580c', cx: '80%',  cy: '40%',  r: '40%',  opacity: 0.65,blur: 110 }, // Warm orange bloom
      { color: '#fb923c', cx: '88%',  cy: '25%',  r: '25%',  opacity: 0.5, blur: 80  }, // Amber horizon glow
      { color: '#fef3c7', cx: '92%',  cy: '12%',  r: '14%',  opacity: 0.3, blur: 60  }, // Setting sun point
    ])
  },

  // ─── macOS High Sierra · Glacial ────────────────────────────────────────
  // Snow-capped peak light: cool platinum whites against a crisp
  // cerulean sky, airy and clean.
  {
    id: 'high_sierra_glacial',
    name: 'High Sierra Glacial',
    dataUrl: generateMeshWallpaper('#0d1b2e', [
      { color: '#1e3a5f', cx: '50%',  cy: '100%', r: '80%',  opacity: 1,   blur: 220 }, // Deep sky base
      { color: '#1d4ed8', cx: '70%',  cy: '60%',  r: '65%',  opacity: 0.6, blur: 170 }, // Cobalt body
      { color: '#93c5fd', cx: '30%',  cy: '20%',  r: '60%',  opacity: 0.5, blur: 150 }, // Pale blue upper
      { color: '#e0f2fe', cx: '40%',  cy: '10%',  r: '40%',  opacity: 0.45,blur: 100 }, // Icy highlight
      { color: '#f0f9ff', cx: '45%',  cy: '5%',   r: '20%',  opacity: 0.35,blur: 70  }, // Snow-peak glint
      { color: '#0ea5e9', cx: '85%',  cy: '30%',  r: '35%',  opacity: 0.35,blur: 120 }, // Cerulean accent
    ])
  },

  // ─── macOS El Capitan · Granite ─────────────────────────────────────────
  // Cool stone grey with silver-blue undertones — the timeless
  // neutral that pairs with everything.
  {
    id: 'el_capitan_granite',
    name: 'El Capitan Granite',
    dataUrl: generateMeshWallpaper('#0f1117', [
      { color: '#1e2333', cx: '50%',  cy: '100%', r: '90%',  opacity: 1,   blur: 220 }, // Dark charcoal base
      { color: '#334155', cx: '80%',  cy: '70%',  r: '70%',  opacity: 0.8, blur: 180 }, // Slate body
      { color: '#64748b', cx: '30%',  cy: '30%',  r: '60%',  opacity: 0.6, blur: 150 }, // Cool grey wash
      { color: '#94a3b8', cx: '55%',  cy: '15%',  r: '40%',  opacity: 0.4, blur: 110 }, // Silver highlight
      { color: '#cbd5e1', cx: '60%',  cy: '8%',   r: '22%',  opacity: 0.3, blur: 80  }, // Bright silver bloom
      { color: '#1e3a5f', cx: '10%',  cy: '60%',  r: '45%',  opacity: 0.3, blur: 190 }, // Cool blue undertone
    ])
  },

  // ─── macOS Sonoma · Rose Quartz ─────────────────────────────────────────
  // Soft warm pink dawn — delicate and luminous, as if the world
  // is made of rose quartz and morning light.
  {
    id: 'sonoma_rose',
    name: 'Sonoma Rose',
    dataUrl: generateMeshWallpaper('#1a0510', [
      { color: '#4c0519', cx: '0%',   cy: '100%', r: '90%',  opacity: 1,   blur: 220 }, // Deep rose base
      { color: '#9f1239', cx: '60%',  cy: '60%',  r: '70%',  opacity: 0.8, blur: 180 }, // Crimson body
      { color: '#e11d48', cx: '70%',  cy: '30%',  r: '50%',  opacity: 0.6, blur: 130 }, // Rose bloom
      { color: '#fb7185', cx: '55%',  cy: '15%',  r: '35%',  opacity: 0.55,blur: 95  }, // Pink highlight
      { color: '#fda4af', cx: '50%',  cy: '8%',   r: '20%',  opacity: 0.4, blur: 70  }, // Soft petal light
      { color: '#fce7f3', cx: '48%',  cy: '3%',   r: '12%',  opacity: 0.2, blur: 55  }, // Bright dawn point
      { color: '#7c3aed', cx: '10%',  cy: '20%',  r: '45%',  opacity: 0.25,blur: 180 }, // Cool violet shadow
    ])
  },

  // ─── macOS Monterey · Coral Atoll ───────────────────────────────────────
  // Warm tropical midday: coral reef turquoise against a rich
  // deep-navy ocean floor.
  {
    id: 'monterey_coral',
    name: 'Monterey Coral',
    dataUrl: generateMeshWallpaper('#020c18', [
      { color: '#083344', cx: '0%',   cy: '100%', r: '90%',  opacity: 1,   blur: 220 }, // Abyssal teal base
      { color: '#0e7490', cx: '40%',  cy: '60%',  r: '70%',  opacity: 0.8, blur: 170 }, // Teal body
      { color: '#06b6d4', cx: '70%',  cy: '30%',  r: '55%',  opacity: 0.65,blur: 120 }, // Cyan reef bloom
      { color: '#22d3ee', cx: '80%',  cy: '15%',  r: '35%',  opacity: 0.55,blur: 85  }, // Bright turquoise
      { color: '#a5f3fc', cx: '85%',  cy: '5%',   r: '18%',  opacity: 0.35,blur: 60  }, // Sunlit surface
      { color: '#0f4c75', cx: '15%',  cy: '20%',  r: '50%',  opacity: 0.5, blur: 190 }, // Deep navy shadow
      { color: '#f97316', cx: '75%',  cy: '55%',  r: '20%',  opacity: 0.15,blur: 100 }, // Warm coral accent
    ])
  },
]

/** Preset solid colors — all matched to the mesh wallpaper palette */
export const SOLID_COLOR_PRESETS = [
  { name: 'Obsidian',     hex: '#0a0a0f' },
  { name: 'Space Black',  hex: '#1c1c1e' },
  { name: 'Deep Navy',    hex: '#0a192f' },
  { name: 'Midnight',     hex: '#06040f' },
  { name: 'Forest Black', hex: '#010f06' },
  { name: 'Slate',        hex: '#1e2333' },
  { name: 'Deep Plum',    hex: '#1a0533' },
  { name: 'Graphite',     hex: '#374151' },
  { name: 'Silver',       hex: '#f2f2f7' },
  { name: 'Starlight',    hex: '#faf9f6' },
]