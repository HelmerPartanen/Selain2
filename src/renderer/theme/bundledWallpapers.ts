// ─── Bundled Wallpaper Registry ──────────────────────────────────────────────
// Auto-discovers all images in assets/wallpapers/ via import.meta.glob.
// Provides stable filename-based identifiers for persistence across rebuilds.

const modules = import.meta.glob<{ default: string }>(
  '@/assets/wallpapers/*.{jpg,jpeg,png,webp}',
  { eager: true }
)

const BUNDLED_PREFIX = 'bundled:'

export interface BundledWallpaper {
  /** Original filename (stable across rebuilds) */
  filename: string
  /** Vite-resolved asset URL (may have content hash) */
  url: string
  /** Stable storage key: `bundled:filename` */
  storageKey: string
}

export const BUNDLED_WALLPAPERS: BundledWallpaper[] = Object.entries(modules).map(
  ([path, mod]) => {
    const filename = path.split('/').pop()!
    return {
      filename,
      url: mod.default,
      storageKey: `${BUNDLED_PREFIX}${filename}`
    }
  }
)

/** Resolve an original filename → current Vite asset URL (for loading) */
const filenameToUrl = new Map(BUNDLED_WALLPAPERS.map((w) => [w.filename, w.url]))

/**
 * Resolve a wallpaper value (from store/disk) to a renderable URL.
 * - `bundled:filename` → Vite asset URL
 * - data URLs / blob URLs → pass through
 * - null → null
 */
export function resolveWallpaperUrl(value: string | null): string | null {
  if (!value) return null
  if (value.startsWith(BUNDLED_PREFIX)) {
    return filenameToUrl.get(value.slice(BUNDLED_PREFIX.length)) ?? null
  }
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

export function generateThumbnail(fullUrl: string): Promise<string> {
  const cached = thumbCache.get(fullUrl)
  if (cached) return Promise.resolve(cached)

  return new Promise<string>((resolve) => {
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
}

/** Generate all bundled wallpaper thumbnails. Returns a Map<fullUrl, thumbUrl>. */
export async function generateAllThumbnails(): Promise<Map<string, string>> {
  const entries = await Promise.all(
    BUNDLED_WALLPAPERS.map(async (wp) => {
      const thumb = await generateThumbnail(wp.url)
      return [wp.url, thumb] as const
    })
  )
  return new Map(entries)
}
