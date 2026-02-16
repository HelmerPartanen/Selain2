// ─── Theme Applicator Hook ───────────────────────────────────────────────────
// Subscribes to the theme store and writes CSS custom properties to document root.
// Mount this once at the App root level.

import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import type { ThemeTokens } from '@/theme/paletteGenerator'

/** Apply all theme tokens as CSS custom properties on :root */
function applyTokensToDOM(tokens: ThemeTokens): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(`--color-${key}`, value)
  }

  // Keep the native title-bar overlay in sync with the tab strip background
  const surfaceDim = tokens['surface-dim']
  if (surfaceDim && window.electronAPI?.setTitleBarColor) {
    window.electronAPI.setTitleBarColor(surfaceDim)
  }
}

// Apply tokens eagerly (before any React render) so there's no flash of
// unstyled content. The store is already hydrated from localStorage by this point.
applyTokensToDOM(useThemeStore.getState().tokens)

/**
 * Hook that synchronizes theme store tokens → CSS custom properties.
 * Call once in your root App component.
 */
export function useThemeApplicator(): void {
  useEffect(() => {
    // Re-apply on mount (covers HMR / late hydration)
    applyTokensToDOM(useThemeStore.getState().tokens)

    // Subscribe to future changes
    const unsub = useThemeStore.subscribe(
      (state) => state.tokens,
      (tokens) => {
        applyTokensToDOM(tokens)
      }
    )
    return unsub
  }, [])
}
