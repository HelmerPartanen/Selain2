import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { PanelModal } from '@/components/ui/PanelModal'
import { SvgIcon } from '@/components/ui/SvgIcon'
import globeSvg from '@/assets/icons/Nature/Globe.svg?raw'
import searchSvg from '@/assets/icons/Objects/Search.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import starSvg from '@/assets/icons/Interface/Star.svg?raw'
import bookmarkSvg from '@/assets/icons/Objects/Bookmark.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useBookmarkStore, type BookmarkEntry } from '@/store/bookmarkStore'
import { useUIStore } from '@/store/uiStore'
import { simplifyUrl } from '@/utils/urlUtils'
import { navigateActiveTab } from '@/utils/tabUtils'
import { SPRING_SNAPPY, SPRING_LIST } from '@/utils/springs'


const BookmarkRow = memo(function BookmarkRow({
  entry,
  onNavigate,
  onRemove,
  index
}: {
  entry: BookmarkEntry
  onNavigate: (url: string) => void
  onRemove: (url: string) => void
  index: number
}): React.JSX.Element {
  const delay = Math.min(index, 16) * 0.02
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_LIST, delay }}
      onClick={() => onNavigate(entry.url)}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors duration-100"
    >
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
        {entry.favicon ? (
          <img src={entry.favicon} alt="" className="w-4 h-4 rounded-sm" draggable={false} />
        ) : (
          <SvgIcon svg={globeSvg} size={16} className="text-gray-400 dark:text-neutral-500" />
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
        <SvgIcon svg={trashSvg} size={14} />
      </button>
    </motion.div>
  )
})

function BookmarksPanelInner(): React.JSX.Element {
  const closeBookmarks = useUIStore((s) => s.closeBookmarks)
  const bookmarks = useBookmarkStore((s) => s.bookmarks)
  const removeBookmark = useBookmarkStore((s) => s.removeBookmark)
  const [query, setQuery] = useState('')
  const [renderLimit, setRenderLimit] = useState(120)

  const filtered = useMemo(() => {
    if (!query) return bookmarks
    const q = query.toLowerCase()
    return bookmarks.filter(
      (b) => b.url.toLowerCase().includes(q) || b.title.toLowerCase().includes(q)
    )
  }, [bookmarks, query])

  const visible = useMemo(() => filtered.slice(0, renderLimit), [filtered, renderLimit])
  const hasMore = visible.length < filtered.length

  const handleNavigate = useCallback(
    (url: string) => {
      navigateActiveTab(url)
      closeBookmarks()
    },
    [closeBookmarks]
  )

  const handleRemove = useCallback((url: string) => {
    removeBookmark(url)
  }, [removeBookmark])

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    if (el.scrollTop + el.clientHeight < el.scrollHeight - 200) return
    setRenderLimit((prev) => {
      if (prev >= filtered.length) return prev
      return Math.min(filtered.length, prev + 120)
    })
  }, [filtered.length])

  // Reset incremental window when query/filter changes
  useEffect(() => {
    setRenderLimit(120)
  }, [query, bookmarks.length])

  return (
    <PanelModal
      onClose={closeBookmarks}
      width="480px"
      height="440px"
      className="flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 className="text-[15px] font-medium text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <SvgIcon svg={bookmarkSvg} size={16} />
              Bookmarks
            </h2>
            <motion.button
              onClick={closeBookmarks}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              transition={SPRING_SNAPPY}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150"
            >
              <SvgIcon svg={closeSvg} size={13} />
            </motion.button>
          </div>

          {/* Search */}
          {bookmarks.length > 0 && (
            <div className="px-6 pt-4 pb-2 flex-shrink-0">
              <div className="relative">
                <SvgIcon svg={searchSvg} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search bookmarks..."
                  autoFocus
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 outline-none border border-transparent focus:border-indigo-500/30 transition-colors duration-150"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 glass-scroll" onScroll={handleScroll}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-neutral-600">
                <SvgIcon svg={starSvg} size={36} className="mb-3 opacity-50" />
                <p className="text-sm">{query ? 'No bookmarks match your search' : 'No bookmarks yet'}</p>
                <p className="text-xs mt-1 opacity-70">Click the star in the URL bar to bookmark a page</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {visible.map((entry, i) => (
                  <BookmarkRow
                    key={entry.id}
                    entry={entry}
                    onNavigate={handleNavigate}
                    onRemove={handleRemove}
                    index={i}
                  />
                ))}
                {hasMore && (
                  <div className="px-3 py-2 text-xs text-gray-500 dark:text-neutral-500">
                    Loading more… ({visible.length}/{filtered.length})
                  </div>
                )}
              </div>
            )}
      </div>
    </PanelModal>
  )
}

export const BookmarksPanel = memo(BookmarksPanelInner)
