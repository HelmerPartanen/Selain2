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
  removeEntry: (url: string) => void
  clearAll: () => void
  getGrouped: () => { label: string; entries: HistoryEntry[] }[]
}

const MAX_ENTRIES = 1000

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],

      recordVisit: (url, title) => {
        if (!url || url === 'about:blank' || url.startsWith('browser://')) return
        set((state) => {
          const entries = state.entries
          // O(n) scan is unavoidable with array storage, but typically the
          // URL we just visited will be near the front (recent visits).
          let idx = -1
          for (let i = 0; i < entries.length; i++) {
            if (entries[i]!.url === url) { idx = i; break }
          }
          let updated: HistoryEntry[]
          if (idx >= 0) {
            const existing = entries[idx]!
            // Avoid full-array spread: splice + unshift for better perf
            updated = entries.slice()
            updated.splice(idx, 1)
            updated.unshift({ url, title: title || existing.title, timestamp: Date.now(), visitCount: existing.visitCount + 1 })
          } else {
            updated = [
              { url, title, timestamp: Date.now(), visitCount: 1 },
              ...entries
            ]
          }
          if (updated.length > MAX_ENTRIES) updated.length = MAX_ENTRIES
          return { entries: updated }
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
        const startOfWeek = startOfToday - now.getDay() * 86400000
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

        const groups: Record<string, HistoryEntry[]> = {
          Today: [],
          Yesterday: [],
          'This Week': [],
          'This Month': [],
          Older: []
        }

        for (const entry of entries) {
          if (entry.timestamp >= startOfToday) {
            groups['Today']!.push(entry)
          } else if (entry.timestamp >= startOfYesterday) {
            groups['Yesterday']!.push(entry)
          } else if (entry.timestamp >= startOfWeek) {
            groups['This Week']!.push(entry)
          } else if (entry.timestamp >= startOfMonth) {
            groups['This Month']!.push(entry)
          } else {
            groups['Older']!.push(entry)
          }
        }

        return Object.entries(groups)
          .filter(([, entries]) => entries.length > 0)
          .map(([label, entries]) => ({ label, entries }))
      }
    }),
    { name: 'browser-history', version: 1 }
  )
)
