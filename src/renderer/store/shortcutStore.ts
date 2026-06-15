import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIPCStorage } from './ipcStorage'
import { logger } from '@/utils/logger'

export interface ShortcutDefinition {
  id: string
  label: string
  group: string
  defaultCombo: string
}

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  { id: 'new-tab', label: 'New tab', group: 'Tabs', defaultCombo: 'Ctrl+T' },
  { id: 'close-tab', label: 'Close current tab', group: 'Tabs', defaultCombo: 'Ctrl+W' },
  { id: 'reopen-tab', label: 'Reopen last closed tab', group: 'Tabs', defaultCombo: 'Ctrl+Shift+T' },
  { id: 'next-tab', label: 'Next tab', group: 'Tabs', defaultCombo: 'Ctrl+Tab' },
  { id: 'previous-tab', label: 'Previous tab', group: 'Tabs', defaultCombo: 'Ctrl+Shift+Tab' },
  { id: 'tab-overview', label: 'Tab overview', group: 'Tabs', defaultCombo: 'Ctrl+Shift+A' },
  { id: 'pin-tab', label: 'Pin or unpin current tab', group: 'Tabs', defaultCombo: 'Ctrl+Shift+P' },
  { id: 'sleep-tab', label: 'Sleep current tab', group: 'Tabs', defaultCombo: 'Ctrl+Shift+Z' },
  { id: 'focus-url', label: 'Focus URL bar', group: 'Navigation', defaultCombo: 'Ctrl+L' },
  { id: 'reload', label: 'Reload page', group: 'Navigation', defaultCombo: 'Ctrl+R' },
  { id: 'back', label: 'Go back', group: 'Navigation', defaultCombo: 'Alt+Left' },
  { id: 'forward', label: 'Go forward', group: 'Navigation', defaultCombo: 'Alt+Right' },
  { id: 'find', label: 'Find in page', group: 'Tools', defaultCombo: 'Ctrl+F' },
  { id: 'command-center', label: 'Command center', group: 'Tools', defaultCombo: 'Ctrl+K' },
  { id: 'toggle-split', label: 'Toggle split view', group: 'Split View', defaultCombo: 'Ctrl+Shift+S' },
  { id: 'swap-split', label: 'Swap split panels', group: 'Split View', defaultCombo: 'Ctrl+Shift+X' },
  { id: 'split-50', label: 'Split 50/50', group: 'Split View', defaultCombo: 'Ctrl+Alt+5' },
  { id: 'split-70', label: 'Split 70/30', group: 'Split View', defaultCombo: 'Ctrl+Alt+7' },
  { id: 'split-30', label: 'Split 30/70', group: 'Split View', defaultCombo: 'Ctrl+Alt+3' },
]

interface ShortcutState {
  shortcuts: Record<string, string>
  setShortcut: (id: string, combo: string) => void
  resetShortcuts: () => void
  getCombo: (id: string) => string
  getConflicts: (id: string, combo: string) => string[]
}

export function normalizeShortcut(combo: string): string {
  return combo
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase()
      if (lower === 'control') return 'Ctrl'
      if (lower === 'cmd' || lower === 'command' || lower === 'meta') return 'Ctrl'
      if (lower === 'option') return 'Alt'
      if (lower.length === 1) return lower.toUpperCase()
      return lower[0]!.toUpperCase() + lower.slice(1)
    })
    .join('+')
}

export function defaultShortcutMap(): Record<string, string> {
  return Object.fromEntries(DEFAULT_SHORTCUTS.map((shortcut) => [shortcut.id, shortcut.defaultCombo]))
}

export const useShortcutStore = create<ShortcutState>()(
  persist(
    (set, get) => ({
      shortcuts: defaultShortcutMap(),

      setShortcut: (id, combo) => {
        const normalized = normalizeShortcut(combo)
        set((state) => ({ shortcuts: { ...state.shortcuts, [id]: normalized } }))
      },

      resetShortcuts: () => {
        set({ shortcuts: defaultShortcutMap() })
      },

      getCombo: (id) => {
        return get().shortcuts[id] ?? DEFAULT_SHORTCUTS.find((s) => s.id === id)?.defaultCombo ?? ''
      },

      getConflicts: (id, combo) => {
        const normalized = normalizeShortcut(combo)
        if (!normalized) return []
        return DEFAULT_SHORTCUTS
          .filter((shortcut) => shortcut.id !== id && (get().shortcuts[shortcut.id] ?? shortcut.defaultCombo) === normalized)
          .map((shortcut) => shortcut.label)
      },
    }),
    {
      name: 'shortcut-store',
      version: 1,
      storage: createIPCStorage<ShortcutState>({
        onParseError(name) {
          logger.error(`[shortcutStore] Corrupted persisted data for '${name}' detected; using defaults`)
        },
      }),
      migrate: (persisted) => {
        const state = persisted as Partial<ShortcutState> | undefined
        return { ...state, shortcuts: { ...defaultShortcutMap(), ...(state?.shortcuts ?? {}) } } as ShortcutState
      },
    },
  ),
)
