// ─── Theme Store ─────────────────────────────────────────────────────────────
// Persists theme mode to localStorage and wallpaper to IndexedDB.
// Supports light, dark, and system theme modes.

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { saveWallpaper, loadWallpaper } from './wallpaperDB'
import { toStorageKey, fromStorageKey } from '@/theme/bundledWallpapers'

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
  setWallpaper: (wallpaper: string | null) => void
  /** Hydrate wallpaper from IndexedDB on startup */
  hydrateWallpaper: () => Promise<void>
}

type ThemeStore = ThemeState & ThemeActions

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
        setWallpaper: (wallpaper: string | null) => {
          set({ wallpaper })
          // Persist to disk — convert bundled asset URLs to stable identifiers
          saveWallpaper(wallpaper ? toStorageKey(wallpaper) : null)
        },
        hydrateWallpaper: async () => {
          const stored = await loadWallpaper()
          // Resolve bundled identifiers back to current Vite asset URLs
          const wallpaper = stored ? fromStorageKey(stored) : null
          set({ wallpaper, wallpaperLoaded: true })
        }
      }),
      {
        name: 'theme-store',
        // Only persist themeMode to localStorage — wallpaper goes to IndexedDB
        partialize: (state) => ({
          themeMode: state.themeMode
        })
      }
    ),
    { name: 'ThemeStore', enabled: import.meta.env.DEV }
  )
)

// Hydrate wallpaper from IndexedDB on module load
useThemeStore.getState().hydrateWallpaper()
