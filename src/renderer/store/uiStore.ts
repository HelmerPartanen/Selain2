import { create } from 'zustand'

interface UIState {
  isSettingsOpen: boolean
  isBookmarksOpen: boolean
  isHistoryOpen: boolean
  isDownloadsOpen: boolean
  isTabOverviewOpen: boolean
  isDropdownOpen: boolean
  isMenuOpen: boolean
  isSpaceSwitcherOpen: boolean
  isFindBarOpen: boolean
  isAISummaryOpen: boolean
  splitRatio: number
  urlBarFocusRequested: boolean

  closeAllPanels: () => void
  toggleSettings: () => void
  closeSettings: () => void
  toggleBookmarks: () => void
  closeBookmarks: () => void
  toggleHistory: () => void
  closeHistory: () => void
  toggleDownloads: () => void
  closeDownloads: () => void
  toggleTabOverview: () => void
  closeTabOverview: () => void
  setDropdownOpen: (open: boolean) => void
  setMenuOpen: (open: boolean) => void
  setSpaceSwitcherOpen: (open: boolean) => void
  openFindBar: () => void
  closeFindBar: () => void
  toggleFindBar: () => void
  toggleAISummary: () => void
  closeAISummary: () => void
  setSplitRatio: (ratio: number) => void
  requestUrlBarFocus: () => void
  clearUrlBarFocus: () => void
}

// Shared close-all used for mutual exclusion — only one panel at a time
const PANELS_CLOSED = {
  isSettingsOpen: false,
  isBookmarksOpen: false,
  isHistoryOpen: false,
  isDownloadsOpen: false,
  isTabOverviewOpen: false,
  isAISummaryOpen: false,
} as const

export const useUIStore = create<UIState>((set) => ({
  isSettingsOpen: false,
  isBookmarksOpen: false,
  isHistoryOpen: false,
  isDownloadsOpen: false,
  isTabOverviewOpen: false,
  isDropdownOpen: false,
  isMenuOpen: false,
  isSpaceSwitcherOpen: false,
  isAISummaryOpen: false,
  isFindBarOpen: false,
  splitRatio: 0.5,
  urlBarFocusRequested: false,

  closeAllPanels: () => set(PANELS_CLOSED),

  // Mutual exclusion: closing others before opening
  toggleSettings: () => set((s) => ({ ...PANELS_CLOSED, isSettingsOpen: !s.isSettingsOpen })),
  closeSettings: () => set({ isSettingsOpen: false }),
  toggleBookmarks: () => set((s) => ({ ...PANELS_CLOSED, isBookmarksOpen: !s.isBookmarksOpen })),
  closeBookmarks: () => set({ isBookmarksOpen: false }),
  toggleHistory: () => set((s) => ({ ...PANELS_CLOSED, isHistoryOpen: !s.isHistoryOpen })),
  closeHistory: () => set({ isHistoryOpen: false }),
  toggleDownloads: () => set((s) => ({ ...PANELS_CLOSED, isDownloadsOpen: !s.isDownloadsOpen })),
  closeDownloads: () => set({ isDownloadsOpen: false }),
  toggleTabOverview: () => set((s) => ({ ...PANELS_CLOSED, isTabOverviewOpen: !s.isTabOverviewOpen })),
  closeTabOverview: () => set({ isTabOverviewOpen: false }),

  setDropdownOpen: (open) => set({ isDropdownOpen: open }),
  setMenuOpen: (open) => set({ isMenuOpen: open }),
  setSpaceSwitcherOpen: (open) => set({ isSpaceSwitcherOpen: open }),
  openFindBar: () => set({ isFindBarOpen: true }),
  closeFindBar: () => set({ isFindBarOpen: false }),
  toggleFindBar: () => set((s) => ({ isFindBarOpen: !s.isFindBarOpen })),
  toggleAISummary: () => set((s) => ({ ...PANELS_CLOSED, isAISummaryOpen: !s.isAISummaryOpen })),
  closeAISummary: () => set({ isAISummaryOpen: false }),
  setSplitRatio: (ratio) => set({ splitRatio: Math.max(0.25, Math.min(0.75, ratio)) }),
  requestUrlBarFocus: () => set({ urlBarFocusRequested: true }),
  clearUrlBarFocus: () => set({ urlBarFocusRequested: false })
}))
