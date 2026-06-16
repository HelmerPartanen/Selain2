// ─── Settings Store ──────────────────────────────────────────────────────────
// Persists all user-configurable browser behavior to localStorage.
// Consumed by FloatingControls (auto-hide delay), TabStore (restore tabs),
// NewTabPage (new tab mode), BrowserLayout (UI zoom, clear on exit).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIPCStorage } from './ipcStorage'
import { logger } from '@/utils/logger'

export type NewTabMode = 'bookmarks' | 'blank'
export type PrivacyProfile = 'standard' | 'strict' | 'private'
export type TabsButtonAction = 'overview' | 'menu'
export type TwoFingerSwipeAction = 'tabs' | 'navigation'

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
  /** Enable auto-hide UI (hover to reveal floating controls) */
  enableAutoHide: boolean
  /** Clear browsing data on exit */
  clearOnExit: boolean
  /** Default privacy behavior for browsing contexts */
  privacyProfile: PrivacyProfile
  /** Whether the user has completed the onboarding flow */
  onboardingCompleted: boolean

  /** Group tabs by domain automatically when navigating */
  autoGroupTabsByDomain: boolean
  /** Show gentle suggestions to clean up long-lived/background tabs */
  showTabCleanupSuggestions: boolean
  /** Automatically focus the URL bar on new/blank tabs */
  smartUrlBarFocus: boolean
  /** Show "Continue where you left off" section on the new tab page */
  showNewTabContinueSection: boolean
  /** Show "Frequent sites" section on the new tab page */
  showNewTabFrequentSection: boolean
  /** Enable built-in Adblocker */
  enableAdblocker: boolean
  /** Mirror vertical wheel scrolling across split panes */
  syncSplitScrolling: boolean

  /** Disable non-essential UI animations */
  disableAnimations: boolean
  /** Disable blur and translucent effects */
  disableBlurEffects: boolean
  /** Two-finger horizontal trackpad swipe behavior */
  twoFingerSwipeAction: TwoFingerSwipeAction

  /** What the tabs count button opens */
  tabsButtonAction: TabsButtonAction
}

export interface SettingsActions {
  setRestoreTabs: (v: boolean) => void
  setNewTabMode: (mode: NewTabMode) => void
  setHomepageUrl: (url: string) => void
  setUiZoom: (zoom: number) => void
  setAutoHideDelay: (ms: number) => void
  setEnableAutoHide: (v: boolean) => void
  setClearOnExit: (v: boolean) => void
  setPrivacyProfile: (v: PrivacyProfile) => void
  setOnboardingCompleted: (v: boolean) => void

  setAutoGroupTabsByDomain: (v: boolean) => void
  setShowTabCleanupSuggestions: (v: boolean) => void
  setSmartUrlBarFocus: (v: boolean) => void
  setShowNewTabContinueSection: (v: boolean) => void
  setShowNewTabFrequentSection: (v: boolean) => void
  setEnableAdblocker: (v: boolean) => void
  setSyncSplitScrolling: (v: boolean) => void
  setDisableAnimations: (v: boolean) => void
  setDisableBlurEffects: (v: boolean) => void
  setTwoFingerSwipeAction: (v: TwoFingerSwipeAction) => void
  setTabsButtonAction: (v: TabsButtonAction) => void
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
      enableAutoHide: true,
      clearOnExit: false,
      privacyProfile: 'standard',
      onboardingCompleted: false,
      autoGroupTabsByDomain: false,
      showTabCleanupSuggestions: true,
      smartUrlBarFocus: true,
      showNewTabContinueSection: true,
      showNewTabFrequentSection: true,
      enableAdblocker: true,
      syncSplitScrolling: false,
      disableAnimations: false,
      disableBlurEffects: false,
      twoFingerSwipeAction: 'tabs' as TwoFingerSwipeAction,
      tabsButtonAction: 'overview' as TabsButtonAction,

      // ── Actions ──
      setRestoreTabs: (v) => set({ restoreTabs: v }),
      setNewTabMode: (mode) => set({ newTabMode: mode }),
      setHomepageUrl: (url) => set({ homepageUrl: url }),
      setUiZoom: (zoom) => set({ uiZoom: zoom }),
      setAutoHideDelay: (ms) => set({ autoHideDelay: Math.max(1000, Math.min(5000, ms)) }),
      setEnableAutoHide: (v) => set({ enableAutoHide: v }),
      setClearOnExit: (v) => set({ clearOnExit: v }),
      setPrivacyProfile: (v) => set({ privacyProfile: v }),
      setOnboardingCompleted: (v) => set({ onboardingCompleted: v }),
      setAutoGroupTabsByDomain: (v) => set({ autoGroupTabsByDomain: v }),
      setShowTabCleanupSuggestions: (v) => set({ showTabCleanupSuggestions: v }),
      setSmartUrlBarFocus: (v) => set({ smartUrlBarFocus: v }),
      setShowNewTabContinueSection: (v) => set({ showNewTabContinueSection: v }),
      setShowNewTabFrequentSection: (v) => set({ showNewTabFrequentSection: v }),
      setEnableAdblocker: (v) => set({ enableAdblocker: v }),
      setSyncSplitScrolling: (v) => set({ syncSplitScrolling: v }),
      setDisableAnimations: (v) => set({ disableAnimations: v }),
      setDisableBlurEffects: (v) => set({ disableBlurEffects: v }),
      setTwoFingerSwipeAction: (v) => set({ twoFingerSwipeAction: v }),
      setTabsButtonAction: (v) => set({ tabsButtonAction: v }),
    }),
    { name: 'browser-settings', version: 1, storage: createIPCStorage<SettingsStore>({
        onParseError(name) {
          logger.error(`[settingsStore] Corrupted persisted data for '${name}' detected; using default settings`)
        }
      }) }
  )
)
