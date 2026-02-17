import { create } from 'zustand'

interface UIState {
  isSettingsOpen: boolean
  toggleSettings: () => void
  closeSettings: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isSettingsOpen: false,
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  closeSettings: () => set({ isSettingsOpen: false })
}))
