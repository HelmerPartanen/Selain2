
// ─── Extract Dominant Color (HSL) ───────────────────────────────────────────
// Samples an image and returns a beautiful, vibrant HSL color by analyzing the
// most colorful pixels, skipping very dark/light/grey ones, and blending strong hues.

const SAMPLE_SIZE = 64 // Downsample to 64×64 — fast and sufficient

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: h * 360, s, l }
}

/**
 * Extract a beautiful, vibrant HSL color from an image URL.
 * Returns { h, s, l } or null if the image is too grey/failed.
 */
export async function extractDominantHSL(imageUrl: string): Promise<{ h: number; s: number; l: number } | null> {
  try {
    const img = await loadImage(imageUrl)
    const canvas = new OffscreenCanvas(SAMPLE_SIZE, SAMPLE_SIZE)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

    // Bucket hues into 36 bins (10° each), weighted by saturation²
    const HUE_BINS = 36
    const bins = Array.from({ length: HUE_BINS }, () => ({ sum: 0, s: 0, l: 0, count: 0 }))
    let totalWeight = 0

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!
      const g = data[i + 1]!
      const blue = data[i + 2]!
      const a = data[i + 3]!
      if (a < 128) continue // skip transparent
      const { h, s, l } = rgbToHsl(r, g, blue)
      if (s < 0.08) continue // allow more pixels, skip only very gray
      if (l < 0.08 || l > 0.92) continue // allow wider range
      const weight = s * s // heavily favor saturated
      const bin = Math.floor(h / (360 / HUE_BINS)) % HUE_BINS
      const binObj = bins[bin]!
      binObj.sum += weight
      binObj.s += s * weight
      binObj.l += l * weight
      binObj.count += weight
      totalWeight += weight
    }
    if (totalWeight < 1) return null

    // Fallback: find the single most saturated pixel if bins are too gray
    let maxSat = 0, maxH = 0, maxL = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!
      const g = data[i + 1]!
      const blue = data[i + 2]!
      const a = data[i + 3]!
      if (a < 128) continue
      const { h, s, l } = rgbToHsl(r, g, blue)
      if (s > maxSat && s > 0.12) {
        maxSat = s; maxH = h; maxL = l
      }
    }

    // Find up to 2 strongest bins for blending
    const sorted = bins.map((b, i) => ({ ...b, i })).sort((a, b) => b.sum - a.sum)
    const main = sorted[0]!
    const second = sorted[1]!
    let h = 0, s = 0, l = 0
    if (second && second.sum > 0.5 * main.sum) {
      const w1 = main.sum, w2 = second.sum
      h = (main.i * w1 + second.i * w2) / (w1 + w2) * (360 / HUE_BINS) + (180 / HUE_BINS)
      s = (main.s + second.s) / (main.count + second.count)
      l = (main.l + second.l) / (main.count + second.count)
    } else {
      h = (main.i * (360 / HUE_BINS)) + (180 / HUE_BINS)
      s = main.s / (main.count || 1)
      l = main.l / (main.count || 1)
    }
    // Boost vibrancy and lightness, clamp less aggressively
    h = ((h % 360) + 360) % 360
    s = Math.max(0.28, Math.min(0.55, s + 0.18)) // much more boost, wider range
    l = Math.max(0.36, Math.min(0.62, l + 0.08)) // allow lighter tints

    // If still too gray, fallback to most saturated pixel
    if (s < 0.22 && maxSat > 0.22) {
      return { h: maxH, s: Math.min(0.55, maxSat + 0.18), l: Math.max(0.36, Math.min(0.62, maxL + 0.08)) }
    }
    return { h, s, l }
  } catch {
    return null
  }
}
