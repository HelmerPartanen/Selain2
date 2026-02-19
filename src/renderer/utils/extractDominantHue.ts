// ─── Extract Dominant Hue ────────────────────────────────────────────────────
// Samples an image and returns its dominant hue (0-360) by drawing it onto a
// small offscreen canvas and analysing pixel data. Uses a fast downscale so it
// works with blob URLs, data URLs, and regular image URLs.
//
// Returns -1 when the image is mostly achromatic or fails to load.

const SAMPLE_SIZE = 64 // Downsample to 64×64 — fast and sufficient

/**
 * Load an image URL into an HTMLImageElement.
 * Handles CORS by allowing anonymous access.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Convert RGB → HSL and return hue (0-360) + saturation (0-1).
 */
function rgbToHueSat(r: number, g: number, b: number): { hue: number; sat: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  const l = (max + min) / 2

  if (d === 0) return { hue: 0, sat: 0 }

  const sat = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let hue = 0
  if (max === rn) hue = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) hue = ((bn - rn) / d + 2) / 6
  else hue = ((rn - gn) / d + 4) / 6

  return { hue: Math.round(hue * 360), sat }
}

/**
 * Extract the dominant hue from an image URL.
 * Returns a hue value 0-360, or -1 if the image is too grey / fails.
 */
export async function extractDominantHue(imageUrl: string): Promise<number> {
  try {
    const img = await loadImage(imageUrl)

    const canvas = new OffscreenCanvas(SAMPLE_SIZE, SAMPLE_SIZE)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

    // Bucket hues into 36 bins (10° each), weighted by saturation
    const HUE_BINS = 36
    const bins = new Float64Array(HUE_BINS)
    let totalWeight = 0

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!
      const a = data[i + 3]!
      if (a < 128) continue // skip transparent

      const { hue, sat } = rgbToHueSat(r, g, b)
      if (sat < 0.08) continue // skip near-grey pixels

      const weight = sat * sat // Heavily favour saturated pixels
      const bin = Math.floor(hue / (360 / HUE_BINS)) % HUE_BINS
      bins[bin]! += weight
      totalWeight += weight
    }

    // If very little chroma was found, the image is achromatic
    if (totalWeight < 1) return -1

    // Find the peak bin
    let peakBin = 0
    let peakVal = 0
    for (let i = 0; i < HUE_BINS; i++) {
      const val = bins[i]!
      if (val > peakVal) {
        peakVal = val
        peakBin = i
      }
    }

    // Refine: weighted average of peak bin ± 1 neighbour
    const prev = (peakBin - 1 + HUE_BINS) % HUE_BINS
    const next = (peakBin + 1) % HUE_BINS
    const wPrev = bins[prev]!
    const wPeak = bins[peakBin]!
    const wNext = bins[next]!
    const sumW = wPrev + wPeak + wNext
    const hueCenter = (360 / HUE_BINS)
    const refinedHue =
      (wPrev * (prev * hueCenter + hueCenter / 2) +
        wPeak * (peakBin * hueCenter + hueCenter / 2) +
        wNext * (next * hueCenter + hueCenter / 2)) /
      sumW

    return Math.round(refinedHue) % 360
  } catch {
    return -1
  }
}
