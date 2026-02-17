import { create } from 'zustand'

interface UIState {
  isSettingsOpen: boolean
  isDropdownOpen: boolean
  isMenuOpen: boolean
  toggleSettings: () => void
  closeSettings: () => void
  setDropdownOpen: (open: boolean) => void
  setMenuOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isSettingsOpen: false,
  isDropdownOpen: false,
  isMenuOpen: false,
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  closeSettings: () => set({ isSettingsOpen: false }),
  setDropdownOpen: (open) => set({ isDropdownOpen: open }),
  setMenuOpen: (open) => set({ isMenuOpen: open })
}))
