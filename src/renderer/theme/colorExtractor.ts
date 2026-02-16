// ─── Color Extractor ─────────────────────────────────────────────────────────
// Wraps node-vibrant to extract a dominant color from an image source.

import { Vibrant } from 'node-vibrant/browser'

export interface ExtractedColors {
  dominant: string      // hex
  vibrant: string | null
  muted: string | null
  darkVibrant: string | null
  darkMuted: string | null
  lightVibrant: string | null
  lightMuted: string | null
}

/**
 * Extract colors from an image source (URL, data URL, or asset path).
 * Returns a set of named swatches; `dominant` is always defined.
 */
export async function extractColorsFromImage(src: string): Promise<ExtractedColors> {
  const palette = await Vibrant.from(src).quality(3).getPalette()

  // Pick the "best" dominant — prefer Vibrant, then Muted, then any available
  const dominant =
    palette.Vibrant?.hex ??
    palette.Muted?.hex ??
    palette.DarkVibrant?.hex ??
    palette.DarkMuted?.hex ??
    palette.LightVibrant?.hex ??
    palette.LightMuted?.hex ??
    '#6d8af0' // fallback blue

  return {
    dominant,
    vibrant: palette.Vibrant?.hex ?? null,
    muted: palette.Muted?.hex ?? null,
    darkVibrant: palette.DarkVibrant?.hex ?? null,
    darkMuted: palette.DarkMuted?.hex ?? null,
    lightVibrant: palette.LightVibrant?.hex ?? null,
    lightMuted: palette.LightMuted?.hex ?? null
  }
}
