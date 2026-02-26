// ─── Bundled Wallpaper Registry ──────────────────────────────────────────────
// Auto-discovers all images in assets/wallpapers/ via import.meta.glob (lazy).
// Provides stable filename-based identifiers for persistence across rebuilds.
// URLs are resolved on demand to keep initial bundle smaller.

const lazyModules = import.meta.glob<{ default: string }>(
  '@/assets/wallpapers/*.{jpg,jpeg,png,webp}'
)

const BUNDLED_PREFIX = 'bundled:'

export interface BundledWallpaper {
  /** Original filename (stable across rebuilds) */
  filename: string
  /** Stable storage key: `bundled:filename` */
  storageKey: string
}

export const BUNDLED_WALLPAPERS: BundledWallpaper[] = Object.keys(lazyModules).map(
  (path) => {
    const filename = path.split('/').pop()!
    return {
      filename,
      storageKey: `${BUNDLED_PREFIX}${filename}`
    }
  }
)

const urlCache = new Map<string, string>()

/**
 * Resolve a bundled wallpaper storage key to a renderable asset URL (lazy load).
 * Caches the result so repeated calls for the same key return the same URL.
 */
export function resolveBundledWallpaperUrl(storageKey: string): Promise<string> {
  if (!storageKey.startsWith(BUNDLED_PREFIX)) {
    return Promise.reject(new Error(`Not a bundled key: ${storageKey}`))
  }
  const cached = urlCache.get(storageKey)
  if (cached) return Promise.resolve(cached)
  const filename = storageKey.slice(BUNDLED_PREFIX.length)
  const path = Object.keys(lazyModules).find((p) => p.endsWith(`/${filename}`))
  if (!path) return Promise.reject(new Error(`Unknown bundled wallpaper: ${filename}`))
  const loader = lazyModules[path] as () => Promise<{ default: string }>
  return loader().then((mod) => {
    const url = mod.default
    urlCache.set(storageKey, url)
    return url
  })
}

/**
 * Resolve a wallpaper value (from store/disk) to a renderable URL (sync).
 * - data URLs / blob URLs → pass through
 * - `bundled:filename` → returns null (use resolveBundledWallpaperUrl for async resolution)
 * - null → null
 */
export function resolveWallpaperUrl(value: string | null): string | null {
  if (!value) return null
  if (value.startsWith(BUNDLED_PREFIX)) return null
  return value
}

/** Check whether a wallpaper store value is a bundled asset */
export function isBundledKey(value: string): boolean {
  return value.startsWith(BUNDLED_PREFIX)
}

// ─── Thumbnail Generation ────────────────────────────────────────────────────
// Creates small JPEG blob URLs for settings panel previews so the browser
// doesn't render full-resolution photos inside tiny 140px buttons.

const THUMB_W = 280 // 140px × 2 for retina
const THUMB_H = 175 // 16:10 aspect

const thumbCache = new Map<string, string>()
const thumbInFlight = new Map<string, Promise<string>>()

const THUMB_MAX_CONCURRENT = 2
let activeThumbJobs = 0
const thumbQueue: Array<() => void> = []

function runThumbTask<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = (): void => {
      activeThumbJobs += 1
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeThumbJobs -= 1
          const next = thumbQueue.shift()
          if (next) next()
        })
    }

    if (activeThumbJobs < THUMB_MAX_CONCURRENT) {
      run()
    } else {
      thumbQueue.push(run)
    }
  })
}

export function generateThumbnail(fullUrl: string): Promise<string> {
  const cached = thumbCache.get(fullUrl)
  if (cached) return Promise.resolve(cached)

  const pending = thumbInFlight.get(fullUrl)
  if (pending) return pending

  const queued = runThumbTask(
    () =>
      new Promise<string>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = (): void => {
          const canvas = document.createElement('canvas')
          canvas.width = THUMB_W
          canvas.height = THUMB_H
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, THUMB_W, THUMB_H)
          canvas.toBlob(
            (blob) => {
              const url = blob ? URL.createObjectURL(blob) : fullUrl
              thumbCache.set(fullUrl, url)
              resolve(url)
            },
            'image/jpeg',
            0.65
          )
        }
        img.onerror = (): void => resolve(fullUrl)
        img.src = fullUrl
      })
  ).finally(() => {
    thumbInFlight.delete(fullUrl)
  })

  thumbInFlight.set(fullUrl, queued)
  return queued
}

/** Generate all bundled wallpaper thumbnails. Returns a Map<fullUrl, thumbUrl>. */
export async function generateAllThumbnails(): Promise<Map<string, string>> {
  const entries = await Promise.all(
    BUNDLED_WALLPAPERS.map(async (wp) => {
      const url = await resolveBundledWallpaperUrl(wp.storageKey)
      const thumb = await generateThumbnail(url)
      return [url, thumb] as const
    })
  )
  return new Map(entries)
}

/**
 * Revoke all cached thumbnail blob URLs and clear the cache.
 * Call this when the wallpaper settings pane unmounts to prevent memory leaks
 * in long-running sessions.
 */
export function clearThumbCache(): void {
  thumbQueue.length = 0
  for (const url of thumbCache.values()) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  }
  thumbCache.clear()
  thumbInFlight.clear()
}
