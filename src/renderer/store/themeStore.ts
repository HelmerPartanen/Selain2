// ─── Theme Store ─────────────────────────────────────────────────────────────
// Persists theme mode to app storage and wallpaper selection to the main process.
// Supports light, dark, and system theme modes.

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { saveWallpaper, loadWallpaper } from './wallpaperDB'
import { createIPCStorage } from './ipcStorage'
import { logger } from '@/utils/logger'

export type ThemeMode = 'dark' | 'light' | 'system'

interface ThemeState {
  /** Theme mode preference */
  themeMode: ThemeMode
  /** Wallpaper URL (data URL, preset SVG, or null for solid fallback) */
  wallpaper: string | null
  /** Whether the wallpaper has been loaded from IndexedDB */
  wallpaperLoaded: boolean
}

interface ThemeActions {
  setThemeMode: (mode: ThemeMode) => void
  setWallpaper: (wallpaper: string | null) => Promise<boolean>
  /** Hydrate wallpaper selection on startup */
  hydrateWallpaper: () => Promise<void>
}

type ThemeStore = ThemeState & ThemeActions

let wallpaperSelectionVersion = 0

export const useThemeStore = create<ThemeStore>()(
  devtools(
    persist(
      (set) => ({
        // ── State ──
        themeMode: 'dark' as ThemeMode,
        wallpaper: null,
        wallpaperLoaded: false,

        // ── Actions ──
        setThemeMode: (mode: ThemeMode) => {
          set({ themeMode: mode })
        },
        setWallpaper: async (wallpaper: string | null) => {
          const version = ++wallpaperSelectionVersion
          const previous = useThemeStore.getState().wallpaper
          set({ wallpaper })
          const saved = await saveWallpaper(wallpaper)
          if (!saved && version === wallpaperSelectionVersion) {
            set({ wallpaper: previous })
          }
          return saved
        },
        hydrateWallpaper: async () => {
          const wallpaper = await loadWallpaper()
          set({ wallpaper: wallpaper ?? null, wallpaperLoaded: true })
        }
      }),
      {
        name: 'theme-store',
        storage: createIPCStorage<Pick<ThemeState, 'themeMode'>>({
          onParseError(name) {
            logger.error(`[themeStore] Corrupted persisted data for '${name}' detected; using system theme`)
          }
        }),
        // Only persist themeMode; wallpaper selection is managed by wallpaperDB.
        partialize: (state) => ({
          themeMode: state.themeMode
        }) as ThemeStore
      }
    ),
    { name: 'ThemeStore', enabled: import.meta.env.DEV }
  )
)

// Hydrate wallpaper selection on module load.
useThemeStore.getState().hydrateWallpaper()
