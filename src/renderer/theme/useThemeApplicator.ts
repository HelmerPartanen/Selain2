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
}

/**
 * Hook that synchronizes theme store tokens → CSS custom properties.
 * Call once in your root App component.
 */
export function useThemeApplicator(): void {
  // Apply immediately on mount with the current tokens
  useEffect(() => {
    const tokens = useThemeStore.getState().tokens
    applyTokensToDOM(tokens)

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
