// ─── Theme Store ─────────────────────────────────────────────────────────────
// Persists theme mode and wallpaper preference to localStorage.
// Supports light, dark, and system theme modes.

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type ThemeMode = 'dark' | 'light' | 'system'

interface ThemeState {
  /** Theme mode preference */
  themeMode: ThemeMode
  /** Wallpaper URL (data URL, preset SVG, or null for solid fallback) */
  wallpaper: string | null
}

interface ThemeActions {
  setThemeMode: (mode: ThemeMode) => void
  setWallpaper: (wallpaper: string | null) => void
}

type ThemeStore = ThemeState & ThemeActions

export const useThemeStore = create<ThemeStore>()(
  devtools(
    persist(
      (set) => ({
        // ── State ──
        themeMode: 'dark' as ThemeMode,
        wallpaper: null,

        // ── Actions ──
        setThemeMode: (mode: ThemeMode) => {
          set({ themeMode: mode })
        },
        setWallpaper: (wallpaper: string | null) => {
          set({ wallpaper })
        }
      }),
      {
        name: 'theme-store',
        partialize: (state) => ({
          themeMode: state.themeMode,
          wallpaper: state.wallpaper
        })
      }
    ),
    { name: 'ThemeStore', enabled: import.meta.env.DEV }
  )
)
