// ─── Settings Store ──────────────────────────────────────────────────────────
// Persists all user-configurable browser behavior to localStorage.
// Consumed by FloatingControls (auto-hide delay), TabStore (restore tabs),
// NewTabPage (new tab mode), BrowserLayout (UI zoom, clear on exit).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NewTabMode = 'bookmarks' | 'blank'

export interface SettingsState {
  /** Restore previous session tabs on startup */
  restoreTabs: boolean
  /** What to show on a new tab page */
  newTabMode: NewTabMode
  /** Homepage URL (empty string = none) */
  homepageUrl: string
  /** UI zoom percentage */
  uiZoom: number
  /** Auto-hide delay for the floating bar (ms) */
  autoHideDelay: number
  /** Clear browsing data on exit */
  clearOnExit: boolean
}

export interface SettingsActions {
  setRestoreTabs: (v: boolean) => void
  setNewTabMode: (mode: NewTabMode) => void
  setHomepageUrl: (url: string) => void
  setUiZoom: (zoom: number) => void
  setAutoHideDelay: (ms: number) => void
  setClearOnExit: (v: boolean) => void
}

export type SettingsStore = SettingsState & SettingsActions

export const UI_ZOOM_OPTIONS = [80, 90, 100, 110, 125, 150] as const

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // ── Defaults ──
      restoreTabs: true,
      newTabMode: 'bookmarks' as NewTabMode,
      homepageUrl: '',
      uiZoom: 100,
      autoHideDelay: 2500,
      clearOnExit: false,

      // ── Actions ──
      setRestoreTabs: (v) => set({ restoreTabs: v }),
      setNewTabMode: (mode) => set({ newTabMode: mode }),
      setHomepageUrl: (url) => set({ homepageUrl: url }),
      setUiZoom: (zoom) => set({ uiZoom: zoom }),
      setAutoHideDelay: (ms) => set({ autoHideDelay: Math.max(1000, Math.min(5000, ms)) }),
      setClearOnExit: (v) => set({ clearOnExit: v }),
    }),
    { name: 'browser-settings', version: 1 }
  )
)
