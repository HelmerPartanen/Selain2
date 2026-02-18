import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIPCStorage } from './ipcStorage'

export interface BookmarkEntry {
  id: string
  url: string
  title: string
  favicon: string | null
  createdAt: number
}

interface BookmarkState {
  bookmarks: BookmarkEntry[]
  favouritePositions: Record<string, { x: number; y: number }>
  addBookmark: (url: string, title: string, favicon?: string | null) => void
  removeBookmark: (url: string) => void
  reorderBookmarks: (fromIndex: number, toIndex: number) => void
  setFavouritePosition: (url: string, x: number, y: number) => void
  isBookmarked: (url: string) => boolean
  search: (query: string) => BookmarkEntry[]
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      favouritePositions: {},

      addBookmark: (url, title, favicon = null) => {
        if (!url || url === 'about:blank' || url.startsWith('browser://')) return
        const existing = get().bookmarks.find((b) => b.url === url)
        if (existing) return
        set((state) => ({
          bookmarks: [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              url,
              title: title || url,
              favicon,
              createdAt: Date.now()
            },
            ...state.bookmarks
          ]
        }))
      },

      removeBookmark: (url) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.url !== url)
        }))
      },

      reorderBookmarks: (fromIndex, toIndex) => {
        set((state) => {
          if (fromIndex < 0 || fromIndex >= state.bookmarks.length) return state
          const next = [...state.bookmarks]
          const [moved] = next.splice(fromIndex, 1)
          if (moved === undefined) return state
          next.splice(toIndex, 0, moved)
          return { bookmarks: next }
        })
      },

      setFavouritePosition: (url, x, y) => {
        set((state) => ({
          favouritePositions: { ...state.favouritePositions, [url]: { x, y } }
        }))
      },

      isBookmarked: (url) => {
        return get().bookmarks.some((b) => b.url === url)
      },

      search: (query) => {
        if (!query || query.length < 1) return get().bookmarks
        const q = query.toLowerCase()
        return get().bookmarks.filter(
          (b) => b.url.toLowerCase().includes(q) || b.title.toLowerCase().includes(q)
        )
      }
    }),
    { name: 'bookmark-store', version: 1, storage: createIPCStorage<BookmarkState>() }
  )
)
