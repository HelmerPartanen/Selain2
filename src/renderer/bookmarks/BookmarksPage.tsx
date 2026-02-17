import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Globe, MagnifyingGlass, Trash, Star, BookmarkSimple, X } from '@phosphor-icons/react'
import { useBookmarkStore, type BookmarkEntry } from '@/store/bookmarkStore'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'

const springPanel = { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.8 }

function simplifyUrl(raw: string): string {
  try {
    const u = new URL(raw)
    return u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname)
  } catch {
    return raw
  }
}

const BookmarkRow = memo(function BookmarkRow({
  entry,
  onNavigate,
  onRemove
}: {
  entry: BookmarkEntry
  onNavigate: (url: string) => void
  onRemove: (url: string) => void
}): React.JSX.Element {
  return (
    <div
      onClick={() => onNavigate(entry.url)}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800/60 transition-colors duration-100"
    >
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
        {entry.favicon ? (
          <img src={entry.favicon} alt="" className="w-4 h-4 rounded-sm" draggable={false} />
        ) : (
          <Globe size={16} className="text-gray-400 dark:text-neutral-500" weight="regular" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {entry.title || simplifyUrl(entry.url)}
        </div>
        <div className="text-xs text-gray-500 dark:text-neutral-500 truncate">
          {simplifyUrl(entry.url)}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(entry.url)
        }}
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-100"
        aria-label="Remove bookmark"
      >
        <Trash size={14} weight="regular" />
      </button>
    </div>
  )
})

function BookmarksPanelInner(): React.JSX.Element {
  const closeBookmarks = useUIStore((s) => s.closeBookmarks)
  const bookmarks = useBookmarkStore((s) => s.bookmarks)
  const removeBookmark = useBookmarkStore((s) => s.removeBookmark)
  const searchFn = useBookmarkStore((s) => s.search)
  const [query, setQuery] = useState('')

  const filtered = query ? searchFn(query) : bookmarks

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeBookmarks()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [closeBookmarks])

  const handleNavigate = useCallback((url: string) => {
    const store = useTabStore.getState()
    const activeId = store.activeTabId
    if (activeId) {
      store.updateTab(activeId, { url })
    }
    closeBookmarks()
  }, [closeBookmarks])

  const handleRemove = useCallback((url: string) => {
    removeBookmark(url)
  }, [removeBookmark])

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[80] bg-black/30 dark:bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onMouseDown={closeBookmarks}
      />

      {/* Panel — genie entrance matching Settings */}
      <div className="fixed inset-0 z-[85] flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-[480px] h-[440px] rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-2xl border border-gray-200/80 dark:border-neutral-700 [app-region:no-drag] pointer-events-auto flex flex-col"
          style={{ transformOrigin: '50% 100%', perspective: 800 }}
          initial={{ y: 220, scaleX: 0.3, scaleY: 0.06, opacity: 0, rotateX: -15 }}
          animate={{ y: 0, scaleX: 1, scaleY: 1, opacity: 1, rotateX: 0 }}
          exit={{ y: 180, scaleX: 0.35, scaleY: 0.06, opacity: 0, rotateX: -10 }}
          transition={springPanel}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0">
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <BookmarkSimple size={16} weight="bold" />
              Bookmarks
            </h2>
            <button
              onClick={closeBookmarks}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-150"
            >
              <X size={13} weight="bold" />
            </button>
          </div>

          {/* Search */}
          {bookmarks.length > 0 && (
            <div className="px-6 pt-4 pb-2 flex-shrink-0">
              <div className="relative">
                <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" weight="regular" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search bookmarks..."
                  autoFocus
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-gray-100 dark:bg-neutral-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 outline-none border border-transparent focus:border-blue-500/30 transition-colors duration-150"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-neutral-600">
                <Star size={36} weight="regular" className="mb-3 opacity-50" />
                <p className="text-sm">{query ? 'No bookmarks match your search' : 'No bookmarks yet'}</p>
                <p className="text-xs mt-1 opacity-70">Click the star in the URL bar to bookmark a page</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filtered.map((entry) => (
                  <BookmarkRow
                    key={entry.id}
                    entry={entry}
                    onNavigate={handleNavigate}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}

export const BookmarksPanel = memo(BookmarksPanelInner)
