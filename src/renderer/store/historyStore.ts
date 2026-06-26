import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIPCStorage } from './ipcStorage'
import { logger } from '@/utils/logger'

export interface HistoryEntry {
  url: string
  title: string
  favicon: string
  timestamp: number
  visitCount: number
}

interface HistoryState {
  entries: HistoryEntry[]
  recordVisit: (url: string, title: string, favicon?: string) => void
  patchEntryTitle: (url: string, title: string) => void
  search: (query: string) => HistoryEntry[]
  removeEntry: (url: string) => void
  clearAll: () => void
  getGrouped: () => { label: string; entries: HistoryEntry[] }[]
}

const MAX_ENTRIES = 1000

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      recordVisit: (url, title, favicon) => {
        if (!url || url === 'about:blank' || url.startsWith('browser://')) return
        set((state) => {
          const entries = state.entries
          let idx = -1
          for (let i = 0; i < entries.length; i++) {
            if (entries[i]!.url === url) { idx = i; break }
          }
          let updated: HistoryEntry[]
          if (idx >= 0) {
            const existing = entries[idx]!
            updated = entries.slice()
            updated.splice(idx, 1)
            updated.unshift({ url, title: title || existing.title, favicon: favicon || existing.favicon, timestamp: Date.now(), visitCount: existing.visitCount + 1 })
          } else {
            updated = [
              { url, title, favicon: favicon || '', timestamp: Date.now(), visitCount: 1 },
              ...entries
            ]
          }
          if (updated.length > MAX_ENTRIES) updated.length = MAX_ENTRIES
          return { entries: updated }
        })
      },

      patchEntryTitle: (url, title) => {
        if (!url || !title) return
        set((state) => {
          const idx = state.entries.findIndex((e) => e.url === url)
          if (idx < 0) return state
          const entries = state.entries.slice()
          entries[idx] = { ...entries[idx]!, title }
          return { entries }
        })
      },

      search: (query) => {
        if (!query || query.length < 2) return []
        const q = query.toLowerCase()
        const entries = get().entries
        const now = Date.now()
        const DAY_MS = 86400000

        const scored: Array<{ entry: HistoryEntry; score: number }> = []

        for (const entry of entries) {
          if (!entry.url.toLowerCase().includes(q) && !entry.title.toLowerCase().includes(q)) continue
          const recency = Math.max(0.1, 1 - (now - entry.timestamp) / (30 * DAY_MS))
          const score = entry.visitCount * recency
          scored.push({ entry, score })
        }

        scored.sort((a, b) => b.score - a.score)
        return scored.slice(0, 6).map((r) => r.entry)
      },

      removeEntry: (url) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.url !== url)
        }))
      },

      clearAll: () => {
        set({ entries: [] })
      },

      getGrouped: () => {
        const entries = get().entries
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const startOfYesterday = startOfToday - 86400000

        const groups = new Map<string, HistoryEntry[]>()

        for (const entry of entries) {
          const date = new Date(entry.timestamp)
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
          const label =
            dayStart >= startOfToday
              ? 'Today'
              : dayStart >= startOfYesterday
                ? 'Yesterday'
                : date.toLocaleDateString([], {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric'
                  })

          const group = groups.get(label)
          if (group) {
            group.push(entry)
          } else {
            groups.set(label, [entry])
          }
        }

        return Array.from(groups, ([label, entries]) => ({ label, entries }))
      }
    }),
    { name: 'browser-history', version: 1, storage: createIPCStorage<HistoryState>({
        onParseError(name) {
          logger.error(`[historyStore] Corrupted persisted data for '${name}' detected; starting with empty history`)
        }
      }) }
  )
)
