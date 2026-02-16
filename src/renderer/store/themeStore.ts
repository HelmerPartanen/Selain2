// ─── Theme Store ─────────────────────────────────────────────────────────────
// Persists wallpaper / solid color choice to localStorage.
// No dynamic UI color adaptation — just background customization.

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type WallpaperType = 'image' | 'solid' | 'none'

export interface ThemeState {
  wallpaperType: WallpaperType
  /** Data URL for custom uploads, or asset path for presets */
  wallpaperSource: string | null
  /** Hex color when wallpaperType is 'solid' */
  solidColor: string | null
}

export interface ThemeActions {
  setWallpaper: (source: string) => void
  setSolidColor: (hex: string) => void
  clearWallpaper: () => void
}

export type ThemeStore = ThemeState & ThemeActions

export const useThemeStore = create<ThemeStore>()(
  devtools(
    persist(
      (set) => ({
        // ── State ──
        wallpaperType: 'none' as WallpaperType,
        wallpaperSource: null,
        solidColor: null,

        // ── Actions ──
        setWallpaper: (source: string) => {
          set({
            wallpaperType: 'image',
            wallpaperSource: source,
            solidColor: null
          })
        },

        setSolidColor: (hex: string) => {
          set({
            wallpaperType: 'solid',
            wallpaperSource: null,
            solidColor: hex
          })
        },

        clearWallpaper: () => {
          set({
            wallpaperType: 'none',
            wallpaperSource: null,
            solidColor: null
          })
        }
      }),
      {
        name: 'theme-store',
        partialize: (state) => ({
          wallpaperType: state.wallpaperType,
          wallpaperSource: state.wallpaperSource,
          solidColor: state.solidColor
        })
      }
    ),
    { name: 'ThemeStore', enabled: import.meta.env.DEV }
  )
)
