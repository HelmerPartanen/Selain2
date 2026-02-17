import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface HistoryEntry {
  url: string
  title: string
  timestamp: number
  visitCount: number
}

interface HistoryState {
  entries: HistoryEntry[]
  recordVisit: (url: string, title: string) => void
  search: (query: string) => HistoryEntry[]
}

const MAX_ENTRIES = 1000

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      recordVisit: (url, title) => {
        if (!url || url === 'about:blank' || url.startsWith('browser://')) return
        set((state) => {
          const idx = state.entries.findIndex((e) => e.url === url)
          let updated: HistoryEntry[]
          if (idx >= 0) {
            const existing = state.entries[idx]!
            updated = [
              { url, title: title || existing.title, timestamp: Date.now(), visitCount: existing.visitCount + 1 },
              ...state.entries.slice(0, idx),
              ...state.entries.slice(idx + 1)
            ]
          } else {
            updated = [
              { url, title, timestamp: Date.now(), visitCount: 1 },
              ...state.entries
            ]
          }
          return { entries: updated.slice(0, MAX_ENTRIES) }
        })
      },

      search: (query) => {
        if (!query || query.length < 2) return []
        const q = query.toLowerCase()
        const entries = get().entries
        const now = Date.now()
        const DAY_MS = 86400000

        return entries
          .filter((e) => e.url.toLowerCase().includes(q) || e.title.toLowerCase().includes(q))
          .sort((a, b) => {
            // Score = visitCount * recency_factor
            const recencyA = Math.max(0.1, 1 - (now - a.timestamp) / (30 * DAY_MS))
            const recencyB = Math.max(0.1, 1 - (now - b.timestamp) / (30 * DAY_MS))
            const scoreA = a.visitCount * recencyA
            const scoreB = b.visitCount * recencyB
            return scoreB - scoreA
          })
          .slice(0, 6)
      }
    }),
    { name: 'browser-history', version: 1 }
  )
)
