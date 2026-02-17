import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface BookmarkEntry {
  id: string
  url: string
  title: string
  favicon: string | null
  createdAt: number
}

interface BookmarkState {
  bookmarks: BookmarkEntry[]
  addBookmark: (url: string, title: string, favicon?: string | null) => void
  removeBookmark: (url: string) => void
  isBookmarked: (url: string) => boolean
  search: (query: string) => BookmarkEntry[]
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],

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
    { name: 'bookmark-store', version: 1 }
  )
)
