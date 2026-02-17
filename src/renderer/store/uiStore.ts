import { create } from 'zustand'

interface UIState {
  isSettingsOpen: boolean
  isDropdownOpen: boolean
  isMenuOpen: boolean
  isFindBarOpen: boolean
  splitRatio: number
  urlBarFocusRequested: boolean

  toggleSettings: () => void
  closeSettings: () => void
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
  isDropdownOpen: false,
  isMenuOpen: false,
  isFindBarOpen: false,
  splitRatio: 0.5,
  urlBarFocusRequested: false,
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  closeSettings: () => set({ isSettingsOpen: false }),
  setDropdownOpen: (open) => set({ isDropdownOpen: open }),
  setMenuOpen: (open) => set({ isMenuOpen: open }),
  openFindBar: () => set({ isFindBarOpen: true }),
  closeFindBar: () => set({ isFindBarOpen: false }),
  toggleFindBar: () => set((s) => ({ isFindBarOpen: !s.isFindBarOpen })),
  setSplitRatio: (ratio) => set({ splitRatio: Math.max(0.25, Math.min(0.75, ratio)) }),
  requestUrlBarFocus: () => set({ urlBarFocusRequested: true }),
  clearUrlBarFocus: () => set({ urlBarFocusRequested: false })
}))
