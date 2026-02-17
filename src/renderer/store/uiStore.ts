import { create } from 'zustand'

interface UIState {
  isSettingsOpen: boolean
  isBookmarksOpen: boolean
  isHistoryOpen: boolean
  isDownloadsOpen: boolean
  isTabOverviewOpen: boolean
  isHotkeysOpen: boolean
  isDropdownOpen: boolean
  isMenuOpen: boolean
  isFindBarOpen: boolean
  splitRatio: number
  urlBarFocusRequested: boolean

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
  toggleHotkeys: () => void
  closeHotkeys: () => void
  setDropdownOpen: (open: boolean) => void
  setMenuOpen: (open: boolean) => void
  openFindBar: () => void
  closeFindBar: () => void
  toggleFindBar: () => void
  setSplitRatio: (ratio: number) => void
  requestUrlBarFocus: () => void
  clearUrlBarFocus: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isSettingsOpen: false,
  isBookmarksOpen: false,
  isHistoryOpen: false,
  isDownloadsOpen: false,
  isTabOverviewOpen: false,
  isHotkeysOpen: false,
  isDropdownOpen: false,
  isMenuOpen: false,
  isFindBarOpen: false,
  splitRatio: 0.5,
  urlBarFocusRequested: false,
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  closeSettings: () => set({ isSettingsOpen: false }),
  toggleBookmarks: () => set((s) => ({ isBookmarksOpen: !s.isBookmarksOpen })),
  closeBookmarks: () => set({ isBookmarksOpen: false }),
  toggleHistory: () => set((s) => ({ isHistoryOpen: !s.isHistoryOpen })),
  closeHistory: () => set({ isHistoryOpen: false }),
  toggleDownloads: () => set((s) => ({ isDownloadsOpen: !s.isDownloadsOpen })),
  closeDownloads: () => set({ isDownloadsOpen: false }),
  toggleTabOverview: () => set((s) => ({ isTabOverviewOpen: !s.isTabOverviewOpen })),
  closeTabOverview: () => set({ isTabOverviewOpen: false }),
  toggleHotkeys: () => set((s) => ({ isHotkeysOpen: !s.isHotkeysOpen })),
  closeHotkeys: () => set({ isHotkeysOpen: false }),
  setDropdownOpen: (open) => set({ isDropdownOpen: open }),
  setMenuOpen: (open) => set({ isMenuOpen: open }),
  openFindBar: () => set({ isFindBarOpen: true }),
  closeFindBar: () => set({ isFindBarOpen: false }),
  toggleFindBar: () => set((s) => ({ isFindBarOpen: !s.isFindBarOpen })),
  setSplitRatio: (ratio) => set({ splitRatio: Math.max(0.25, Math.min(0.75, ratio)) }),
  requestUrlBarFocus: () => set({ urlBarFocusRequested: true }),
  clearUrlBarFocus: () => set({ urlBarFocusRequested: false })
}))
