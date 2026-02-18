import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIPCStorage } from './ipcStorage'

export interface SearchEngine {
  id: string
  name: string
  searchUrl: string // Use {query} as placeholder
  icon: string      // Emoji or short label
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'google', name: 'Google', searchUrl: 'https://www.google.com/search?q={query}', icon: 'G' },
  { id: 'duckduckgo', name: 'DuckDuckGo', searchUrl: 'https://duckduckgo.com/?q={query}', icon: 'D' },
  { id: 'bing', name: 'Bing', searchUrl: 'https://www.bing.com/search?q={query}', icon: 'B' },
  { id: 'yahoo', name: 'Yahoo', searchUrl: 'https://search.yahoo.com/search?p={query}', icon: 'Y' },
  { id: 'brave', name: 'Brave Search', searchUrl: 'https://search.brave.com/search?q={query}', icon: 'Br' },
  { id: 'startpage', name: 'Startpage', searchUrl: 'https://www.startpage.com/do/dsearch?query={query}', icon: 'S' }
]

interface SearchEngineState {
  engineId: string
  setEngine: (id: string) => void
  getSearchUrl: (query: string) => string
}

export const useSearchEngineStore = create<SearchEngineState>()(
  persist(
    (set, get) => ({
      engineId: 'google',

      setEngine: (id) => {
        if (SEARCH_ENGINES.some((e) => e.id === id)) {
          set({ engineId: id })
        }
      },

      getSearchUrl: (query) => {
        const engine = SEARCH_ENGINES.find((e) => e.id === get().engineId) ?? SEARCH_ENGINES[0]!
        return engine.searchUrl.replace('{query}', encodeURIComponent(query))
      }
    }),
    { name: 'search-engine', version: 1, storage: createIPCStorage<SearchEngineState>() }
  )
)
