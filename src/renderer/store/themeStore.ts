// ─── Theme Store ─────────────────────────────────────────────────────────────
// Persists wallpaper choice, theme mode, and generated color tokens to localStorage.

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import {
  type ThemeTokens,
  type ThemeMode,
  DEFAULT_DARK_TOKENS,
  DEFAULT_LIGHT_TOKENS,
  generatePalette,
  autoDetectMode
} from '@/theme/paletteGenerator'
import { extractAverageColor } from '@/theme/colorExtractor'

export type WallpaperType = 'image' | 'solid' | 'none'

export interface ThemeState {
  wallpaperType: WallpaperType
  /** Data URL for custom uploads, or asset path for presets */
  wallpaperSource: string | null
  /** Hex color when wallpaperType is 'solid' */
  solidColor: string | null
  /** The seed/average color extracted from the current wallpaper */
  seedColor: string | null
  /** User preference */
  themeMode: 'auto' | 'light' | 'dark'
  /** Computed from auto-detection or manual override */
  resolvedMode: ThemeMode
  /** The generated CSS token values */
  tokens: ThemeTokens
  /** Whether a palette computation is in progress */
  isComputing: boolean
}

export interface ThemeActions {
  setWallpaper: (source: string, type: WallpaperType, seedColor?: string) => Promise<void>
  setSolidColor: (hex: string) => void
  clearWallpaper: () => void
  setThemeMode: (mode: 'auto' | 'light' | 'dark') => void
}

export type ThemeStore = ThemeState & ThemeActions

export const useThemeStore = create<ThemeStore>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        // ── State ──
        wallpaperType: 'none' as WallpaperType,
        wallpaperSource: null,
        solidColor: null,
        seedColor: null,
        themeMode: 'auto' as 'auto' | 'light' | 'dark',
        resolvedMode: 'dark' as ThemeMode,
        tokens: DEFAULT_DARK_TOKENS,
        isComputing: false,

        // ── Actions ──
        setWallpaper: async (source: string, type: WallpaperType, seedColor?: string) => {
          set({ isComputing: true, wallpaperType: type, wallpaperSource: source, solidColor: null })

          try {
            if (type === 'image') {
              // Use provided seedColor (for presets) or compute the average color
              let seed: string
              if (seedColor) {
                seed = seedColor
              } else {
                seed = await extractAverageColor(source)
              }
              const { themeMode } = get()
              const resolvedMode = themeMode === 'auto'
                ? autoDetectMode(seed)
                : themeMode
              const tokens = generatePalette(seed, resolvedMode)
              set({ tokens, resolvedMode, seedColor: seed, isComputing: false })
              notifyTitleBarColor(tokens['surface-dim'])
            } else if (type === 'solid') {
              const { themeMode } = get()
              const resolvedMode = themeMode === 'auto'
                ? autoDetectMode(source)
                : themeMode
              const tokens = generatePalette(source, resolvedMode)
              set({ tokens, resolvedMode, solidColor: source, wallpaperSource: null, isComputing: false })
              notifyTitleBarColor(tokens['surface-dim'])
            }
          } catch (err) {
            console.error('[ThemeStore] Failed to process wallpaper:', err)
            set({ isComputing: false })
          }
        },

        setSolidColor: (hex: string) => {
          const { themeMode } = get()
          const resolvedMode = themeMode === 'auto'
            ? autoDetectMode(hex)
            : themeMode
          const tokens = generatePalette(hex, resolvedMode)
          set({
            wallpaperType: 'solid',
            wallpaperSource: null,
            solidColor: hex,
            seedColor: hex,
            tokens,
            resolvedMode,
            isComputing: false
          })
          notifyTitleBarColor(tokens['surface-dim'])
        },

        clearWallpaper: () => {
          const { themeMode } = get()
          const resolvedMode = themeMode === 'auto' ? 'dark' : themeMode
          const tokens = resolvedMode === 'dark' ? DEFAULT_DARK_TOKENS : DEFAULT_LIGHT_TOKENS
          set({
            wallpaperType: 'none',
            wallpaperSource: null,
            solidColor: null,
            seedColor: null,
            tokens,
            resolvedMode,
            isComputing: false
          })
          notifyTitleBarColor(tokens['surface-dim'])
        },

        setThemeMode: (mode: 'auto' | 'light' | 'dark') => {
          const state = get()
          let resolvedMode: ThemeMode

          if (mode === 'auto') {
            if (state.seedColor) {
              resolvedMode = autoDetectMode(state.seedColor)
            } else {
              resolvedMode = 'dark'
            }
          } else {
            resolvedMode = mode
          }

          // Regenerate tokens from the stored seed color
          let tokens: ThemeTokens
          if (state.seedColor) {
            tokens = generatePalette(state.seedColor, resolvedMode)
          } else {
            tokens = resolvedMode === 'dark' ? DEFAULT_DARK_TOKENS : DEFAULT_LIGHT_TOKENS
          }

          set({ themeMode: mode, resolvedMode, tokens })
          notifyTitleBarColor(tokens['surface-dim'])
        }
      })),
      {
        name: 'theme-store',
        partialize: (state) => ({
          wallpaperType: state.wallpaperType,
          wallpaperSource: state.wallpaperSource,
          solidColor: state.solidColor,
          seedColor: state.seedColor,
          themeMode: state.themeMode,
          resolvedMode: state.resolvedMode,
          tokens: state.tokens
        })
      }
    ),
    { name: 'ThemeStore', enabled: import.meta.env.DEV }
  )
)

/** Notify the main process to update the Windows title bar overlay color */
function notifyTitleBarColor(hex: string): void {
  try {
    window.electronAPI?.setTitleBarColor?.(hex)
  } catch {
    // Silently fail if the API isn't available yet
  }
}
