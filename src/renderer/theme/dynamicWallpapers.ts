// ─── Dynamic Wallpaper Registry ──────────────────────────────────────────────
// Auto-discovers all images in assets/wallpapers/dynamic/ via import.meta.glob
// (LAZY). The set is built on first request and cached; the renderer does not
// ship any of the wallpaper bytes until a `dynamic:` wallpaper is selected.

const lazyModules = import.meta.glob<{ default: string }>(
  '@/assets/wallpapers/dynamic/Wallpaper_{Base,Dark,Light}_*.{jpg,jpeg,png,webp}'
)

const DYNAMIC_PREFIX = 'dynamic:'
export const DYNAMIC_DEFAULT_KEY = `${DYNAMIC_PREFIX}default`

/**
 * Default dynamic wallpaper storage key. Synonym for {@link DYNAMIC_DEFAULT_KEY}
 * preserved for callers that imported it under the old name.
 */
export const DYNAMIC_WALLPAPER_KEY = DYNAMIC_DEFAULT_KEY

export type DynamicWallpaperMode = 'dynamic' | 'light' | 'dark'

export interface DynamicWallpaperSet {
  /** Normalized identifier (e.g. 'base-blue') */
  id: string
  name: string
  storageKey: string
  base: string
  dark: string
  light: string
}

export interface DynamicWallpaperLayer {
  url: string
  opacity: number
}

interface DynamicWallpaperDraft {
  id: string
  name: string
  base?: string
  dark?: string
  light?: string
}

interface CompleteDynamicWallpaperDraft extends DynamicWallpaperDraft {
  base: string
  dark: string
  light: string
}

function formatName(id: string): string {
  return id
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function normalizeId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── Async registry (built once, then cached) ─────────────────────────────────

let cachedSets: Promise<DynamicWallpaperSet[]> | null = null

async function buildDynamicWallpaperSets(): Promise<DynamicWallpaperSet[]> {
  const drafts = new Map<string, DynamicWallpaperDraft>()

  // Resolve every glob entry. import.meta.glob with eager:false gives us a
  // function we can call to load each module.
  const resolvedEntries = await Promise.all(
    Object.entries(lazyModules).map(async ([path, loader]) => {
      const mod = await loader()
      return [path, mod.default] as const
    })
  )

  for (const [path, url] of resolvedEntries) {
    const filename = path.split('/').pop() ?? ''
    const match = /^Wallpaper_(Base|Dark|Light)_(.+)\.(?:jpe?g|png|webp)$/i.exec(filename)
    if (!match) continue

    const variant = match[1]!.toLowerCase() as 'base' | 'dark' | 'light'
    const name = match[2]!
    const id = normalizeId(name)
    const draft = drafts.get(id) ?? { id, name: formatName(name) }
    draft[variant] = url
    drafts.set(id, draft)
  }

  return [...drafts.values()]
    .filter((draft): draft is CompleteDynamicWallpaperDraft => {
      return !!draft.base && !!draft.dark && !!draft.light
    })
    .map((draft) => ({
      id: draft.id,
      name: draft.name,
      storageKey: `${DYNAMIC_PREFIX}${draft.id}`,
      base: draft.base,
      dark: draft.dark,
      light: draft.light
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Lazily load the full set of dynamic wallpapers. The promise is cached; the
 * underlying import.meta.glob modules are evaluated once on first call.
 */
export function loadDynamicWallpapers(): Promise<DynamicWallpaperSet[]> {
  if (!cachedSets) cachedSets = buildDynamicWallpaperSets()
  return cachedSets
}

/**
 * Resolve a wallpaper storage key to its loaded set.
 * Returns null if the key isn't dynamic or the registry isn't loaded yet.
 */
export async function resolveDynamicWallpaperSet(
  storageKey: string | null
): Promise<DynamicWallpaperSet | null> {
  if (!storageKey || !isDynamicWallpaperKey(storageKey)) return null
  const sets = await loadDynamicWallpapers()
  return sets.find((wallpaper) => wallpaper.storageKey === storageKey) ?? null
}

const MODE_STORAGE_KEY = 'dynamic-wallpaper-mode'
const MODE_EVENT = 'dynamic-wallpaper-mode-change'

export function isDynamicWallpaperKey(value: string): boolean {
  return value.startsWith(DYNAMIC_PREFIX)
}

export function getDynamicWallpaperVariantUrls(
  storageKey: string | null
): Promise<string[]> {
  return resolveDynamicWallpaperSet(storageKey).then((set) => {
    if (!set) return []
    return [set.dark, set.base, set.light]
  })
}

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

function blend(startHour: number, endHour: number, hour: number): number {
  return smoothstep((hour - startHour) / (endHour - startHour))
}

function normalizeHour(hour: number): number {
  return ((hour % 24) + 24) % 24
}

export function getDynamicWallpaperHour(date = new Date()): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
}

export function getDynamicWallpaperMode(): DynamicWallpaperMode {
  if (typeof window === 'undefined') return 'dynamic'
  const raw = window.localStorage.getItem(MODE_STORAGE_KEY)
  return raw === 'light' || raw === 'dark' || raw === 'dynamic'
    ? raw
    : 'dynamic'
}

export function setDynamicWallpaperMode(mode: DynamicWallpaperMode): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MODE_STORAGE_KEY, mode)
  window.dispatchEvent(new Event(MODE_EVENT))
}

export function subscribeDynamicWallpaperMode(
  callback: () => void
): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event: StorageEvent): void => {
    if (event.key === MODE_STORAGE_KEY) callback()
  }
  window.addEventListener(MODE_EVENT, callback)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(MODE_EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Compute the layers for a dynamic wallpaper at a given moment.
 * Awaits the registry on first call.
 */
export async function getDynamicWallpaperLayers(
  storageKey: string | null,
  time: Date | number = new Date(),
  mode: DynamicWallpaperMode = 'dynamic'
): Promise<DynamicWallpaperLayer[]> {
  let wallpaper: DynamicWallpaperSet | null = await resolveDynamicWallpaperSet(storageKey)
  if (!wallpaper) {
    const sets = await loadDynamicWallpapers()
    wallpaper = sets[0] ?? null
  }
  if (!wallpaper) return []

  if (mode === 'dark') return [{ url: wallpaper.dark, opacity: 1 }]
  if (mode === 'light') return [{ url: wallpaper.light, opacity: 1 }]

  const hour =
    typeof time === 'number' ? normalizeHour(time) : getDynamicWallpaperHour(time)

  let dark = 0
  let base = 0
  let light = 0

  if (hour < 5 || hour >= 22) {
    dark = 1
  } else if (hour < 7) {
    const t = blend(5, 7, hour)
    dark = 1 - t
    base = t
  } else if (hour < 10) {
    base = 1
  } else if (hour < 12) {
    const t = blend(10, 12, hour)
    base = 1 - t
    light = t
  } else if (hour < 16) {
    light = 1
  } else if (hour < 18) {
    const t = blend(16, 18, hour)
    light = 1 - t
    base = t
  } else if (hour < 20) {
    base = 1
  } else {
    const t = blend(20, 22, hour)
    base = 1 - t
    dark = t
  }

  return [
    { url: wallpaper.dark, opacity: dark },
    { url: wallpaper.base, opacity: base },
    { url: wallpaper.light, opacity: light }
  ].filter((layer) => layer.opacity > 0.001)
}
