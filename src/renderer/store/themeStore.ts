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
import { extractColorsFromImage } from '@/theme/colorExtractor'

export type WallpaperType = 'image' | 'solid' | 'none'

export interface ThemeState {
  wallpaperType: WallpaperType
  /** Data URL for custom uploads, or asset path for presets */
  wallpaperSource: string | null
  /** Hex color when wallpaperType is 'solid' */
  solidColor: string | null
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
        themeMode: 'auto' as 'auto' | 'light' | 'dark',
        resolvedMode: 'dark' as ThemeMode,
        tokens: DEFAULT_DARK_TOKENS,
        isComputing: false,

        // ── Actions ──
        setWallpaper: async (source: string, type: WallpaperType, seedColor?: string) => {
          set({ isComputing: true, wallpaperType: type, wallpaperSource: source, solidColor: null })

          try {
            if (type === 'image') {
              // Use provided seedColor (for presets) or extract from image
              let dominant: string
              if (seedColor) {
                dominant = seedColor
              } else {
                const colors = await extractColorsFromImage(source)
                dominant = colors.dominant
              }
              const { themeMode } = get()
              const resolvedMode = themeMode === 'auto'
                ? autoDetectMode(dominant)
                : themeMode
              const tokens = generatePalette(dominant, resolvedMode)
              set({ tokens, resolvedMode, isComputing: false })
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
            // Determine from current wallpaper/color
            if (state.wallpaperType === 'solid' && state.solidColor) {
              resolvedMode = autoDetectMode(state.solidColor)
            } else {
              // If image-based, re-extract would be expensive; use current resolved
              resolvedMode = state.resolvedMode
            }
          } else {
            resolvedMode = mode
          }

          // Regenerate tokens with the new mode
          let tokens: ThemeTokens
          if (state.wallpaperType === 'solid' && state.solidColor) {
            tokens = generatePalette(state.solidColor, resolvedMode)
          } else if (state.wallpaperType === 'none') {
            tokens = resolvedMode === 'dark' ? DEFAULT_DARK_TOKENS : DEFAULT_LIGHT_TOKENS
          } else {
            // Image-based: we still have the old tokens' accent hue; regenerate with it
            // We'll use the accent as the seed (best approximation without re-extracting)
            tokens = generatePalette(state.tokens.accent, resolvedMode)
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
