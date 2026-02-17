// ─── Bundled Wallpaper Registry ──────────────────────────────────────────────
// Auto-discovers all images in assets/wallpapers/ via import.meta.glob.
// Provides stable filename-based identifiers for persistence across rebuilds.

const modules = import.meta.glob<{ default: string }>(
  '@/assets/wallpapers/*.{jpg,jpeg,png,webp}',
  { eager: true }
)

export interface BundledWallpaper {
  /** Original filename (stable across rebuilds) */
  filename: string
  /** Vite-resolved asset URL (may have content hash) */
  url: string
}

export const BUNDLED_WALLPAPERS: BundledWallpaper[] = Object.entries(modules).map(
  ([path, mod]) => ({
    filename: path.split('/').pop()!,
    url: mod.default
  })
)

/** Resolve a Vite asset URL → original filename (for saving) */
const urlToFilename = new Map(BUNDLED_WALLPAPERS.map((w) => [w.url, w.filename]))

/** Resolve an original filename → current Vite asset URL (for loading) */
const filenameToUrl = new Map(BUNDLED_WALLPAPERS.map((w) => [w.filename, w.url]))

const BUNDLED_PREFIX = 'bundled:'

/** Convert a wallpaper value to a persistable string. Bundled → `bundled:filename`, others pass through. */
export function toStorageKey(wallpaper: string): string {
  const filename = urlToFilename.get(wallpaper)
  return filename ? `${BUNDLED_PREFIX}${filename}` : wallpaper
}

/** Resolve a stored wallpaper key back to a usable URL. `bundled:filename` → current Vite asset URL. */
export function fromStorageKey(key: string): string | null {
  if (key.startsWith(BUNDLED_PREFIX)) {
    return filenameToUrl.get(key.slice(BUNDLED_PREFIX.length)) ?? null
  }
  return key
}

/** Check whether a wallpaper value is a bundled asset URL */
export function isBundledWallpaper(wallpaper: string): boolean {
  return urlToFilename.has(wallpaper)
}
