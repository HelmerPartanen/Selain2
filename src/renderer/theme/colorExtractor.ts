// ─── Color Extractor ─────────────────────────────────────────────────────────
// Computes the average color of an image using a downscaled Canvas.
// This gives the true overall tint of the wallpaper, not a palette swatch.

import { rgbToHex } from './contrastUtils'

/**
 * Compute the average color of an image by sampling every pixel on a
 * small (downscaled) canvas. Returns a hex string.
 */
export function extractAverageColor(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      // Downscale to max 64px on the longest side for speed
      const scale = Math.min(1, 64 / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve('#6d8af0') // fallback
        return
      }

      ctx.drawImage(img, 0, 0, w, h)
      const data = ctx.getImageData(0, 0, w, h).data

      let rSum = 0, gSum = 0, bSum = 0
      let count = 0
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3]!
        // Skip fully transparent pixels
        if (a < 10) continue
        rSum += data[i]!
        gSum += data[i + 1]!
        bSum += data[i + 2]!
        count++
      }

      if (count === 0) {
        resolve('#6d8af0')
        return
      }

      resolve(rgbToHex(
        Math.round(rSum / count),
        Math.round(gSum / count),
        Math.round(bSum / count)
      ))
    }

    img.onerror = () => reject(new Error(`Failed to load image for color extraction`))
    img.src = src
  })
}
