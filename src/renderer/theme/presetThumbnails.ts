// ─── Preset Thumbnail Cache ──────────────────────────────────────────────────
// Rasterizes the SVG preset wallpapers to small JPEG blob URLs for the
// settings pane. The pane renders ~8 of these side-by-side; using inline
// 1920x1080 SVG data URLs forces the browser to decode + rasterize them on
// every paint, which is the main source of the pane's jank.
//
// The fullscreen wallpaper layer (in BrowserLayout) keeps using the SVG data
// URLs — there is only one such layer and the cost is paid once per change.

import type { WallpaperPreset } from './presets'

const THUMB_W = 280
const THUMB_H = 175
const THUMB_QUALITY = 0.78

type CacheKey = string // `${presetId}:${isDark ? 'd' : 'l'}`

const cache = new Map<CacheKey, string>()
const inFlight = new Map<CacheKey, Promise<string>>()

const MAX_CONCURRENT = 4
let activeJobs = 0
const queue: Array<() => void> = []

function runTask<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = (): void => {
      activeJobs += 1
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeJobs -= 1
          const next = queue.shift()
          if (next) next()
        })
    }
    if (activeJobs < MAX_CONCURRENT) {
      run()
    } else {
      queue.push(run)
    }
  })
}

/**
 * Get (or generate) a small JPEG blob URL for the given preset/variant.
 * Safe to call from render — the same `(presetId, isDark)` pair always
 * returns the same cached URL synchronously after the first generation.
 */
export function getPresetThumbnailUrl(
  preset: WallpaperPreset,
  isDark: boolean,
): string {
  const key: CacheKey = `${preset.id}:${isDark ? 'd' : 'l'}`
  const cached = cache.get(key)
  if (cached) return cached
  if (inFlight.has(key)) return '' // a previous render is already producing it
  const svgUrl = isDark ? preset.dark : preset.light

  const job = runTask(
    () =>
      new Promise<string>((resolve) => {
        const img = new Image()
        img.onload = (): void => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = THUMB_W
            canvas.height = THUMB_H
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0, THUMB_W, THUMB_H)
            canvas.toBlob(
              (blob) => {
                const url = blob ? URL.createObjectURL(blob) : svgUrl
                cache.set(key, url)
                resolve(url)
              },
              'image/jpeg',
              THUMB_QUALITY,
            )
          } catch {
            // Fall back to the SVG data URL on any canvas error
            cache.set(key, svgUrl)
            resolve(svgUrl)
          }
        }
        img.onerror = (): void => {
          cache.set(key, svgUrl)
          resolve(svgUrl)
        }
        img.src = svgUrl
      }),
  ).finally(() => {
    inFlight.delete(key)
  })

  inFlight.set(key, job)
  return ''
}

/** Test/debug helper — wipe the cache. */
export function clearPresetThumbnailCache(): void {
  queue.length = 0
  for (const url of cache.values()) {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url)
  }
  cache.clear()
  inFlight.clear()
}
