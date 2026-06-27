import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { m } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Input'
import { PanelModal } from '@/components/ui/PanelModal'
import { SvgIcon } from '@/components/ui/SvgIcon'
import globeSvg from '@/assets/icons/Nature/Globe.svg?raw'
import searchSvg from '@/assets/icons/Objects/Search.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import starSvg from '@/assets/icons/Interface/Star.svg?raw'
import bookmarkSvg from '@/assets/icons/Objects/Bookmark.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useBookmarkStore, type BookmarkEntry } from '@/store/bookmarkStore'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { simplifyUrl } from '@/utils/urlUtils'
import { navigateActiveTab } from '@/utils/tabUtils'
import { SPRING_LIST } from '@/utils/springs'
import { showToast } from '@/components/ui/toastStore'

const SEARCH_DEBOUNCE_MS = 200


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
  const [hovered, setHovered] = useState(false)

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_LIST, delay }}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          useTabStore.getState().addTabInCurrentContext(entry.url)
          useUIStore.getState().closeBookmarks()
        } else {
          onNavigate(entry.url)
        }
      }}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault()
          useTabStore.getState().addTabInCurrentContext(entry.url)
          useUIStore.getState().closeBookmarks()
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="relative group flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-150"
    >

      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 overflow-hidden z-10">
        {entry.favicon ? (
          <img src={entry.favicon} alt="" className="w-6 h-6" draggable={false} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <SvgIcon svg={globeSvg} size={28} className="text-gray-400 dark:text-neutral-500" />
        )}
      </div>
      <div className="flex-1 min-w-0 z-10">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {entry.title || simplifyUrl(entry.url)}
        </div>
        <div className="text-xs text-gray-500 dark:text-neutral-500 truncate">
          {simplifyUrl(entry.url)}
        </div>
      </div>
      <Button
        variant="danger"
        size="icon-md"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(entry.url)
        }}
        className="z-10 h-10 w-10 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Remove bookmark"
      >
        <SvgIcon svg={trashSvg} size={16} />
      </Button>
    </m.div>
  )
})

function BookmarksPanelInner(): React.JSX.Element {
  const closeBookmarks = useUIStore((s) => s.closeBookmarks)
  const bookmarks = useBookmarkStore((s) => s.bookmarks)
  const removeBookmark = useBookmarkStore((s) => s.removeBookmark)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [renderLimit, setRenderLimit] = useState(120)

  // Debounce search query to reduce O(n) filter calls
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const filtered = useMemo(() => {
    if (!debouncedQuery) return bookmarks
    const q = debouncedQuery.toLowerCase()
    return bookmarks.filter(
      (b) => b.url.toLowerCase().includes(q) || b.title.toLowerCase().includes(q)
    )
  }, [bookmarks, debouncedQuery])

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

  const handleExport = useCallback(async () => {
    const items = bookmarks
      .map((b) => `    <DT><A HREF="${b.url}" ADD_DATE="${Math.floor((b.createdAt || Date.now()) / 1000)}">${b.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</A>`)
      .join('\n')
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n${items}\n</DL><p>`
    const ok = await window.electronAPI.exportBookmarksHtml(html)
    if (ok) showToast({ message: 'Bookmarks exported', type: 'success' })
  }, [bookmarks])

  const handleBookmarkAll = useCallback(() => {
    const { tabs, tabOrder } = useTabStore.getState()
    const store = useBookmarkStore.getState()
    let count = 0
    for (const id of tabOrder) {
      const tab = tabs[id]
      if (!tab || !tab.url.startsWith('http')) continue
      store.addBookmark(tab.url, tab.title || tab.url, tab.favicon || null)
      count++
    }
    if (count > 0) showToast({ message: `${count} tab${count === 1 ? '' : 's'} bookmarked`, type: 'success' })
  }, [])

  const handleImport = useCallback(async () => {
    const html = await window.electronAPI.importBookmarksHtml()
    if (!html) return
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const links = Array.from(doc.querySelectorAll('a[href]'))
    const store = useBookmarkStore.getState()
    let count = 0
    for (const a of links) {
      const url = a.getAttribute('href') || ''
      if (!url.startsWith('http')) continue
      const title = a.textContent?.trim() || url
      store.addBookmark(url, title, null)
      count++
    }
    showToast({ message: count > 0 ? `${count} bookmarks imported` : 'No bookmarks found', type: count > 0 ? 'success' : 'info' })
  }, [])

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
      <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px bg-black/[0.04] dark:bg-white/[0.06]' }}>
        <h2 className="text-[15px] font-medium text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <SvgIcon svg={bookmarkSvg} size={16} />
          Bookmarks
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={handleBookmarkAll}
            title="Bookmark all open tabs"
          >
            Bookmark all
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleImport}
            title="Import bookmarks from HTML"
          >
            Import
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={handleExport}
            disabled={bookmarks.length === 0}
            title="Export bookmarks to HTML"
          >
            Export
          </Button>
          <Button
            variant="icon"
            onClick={closeBookmarks}
            aria-label="Close bookmarks"
          >
            <SvgIcon svg={closeSvg} size={16} />
          </Button>
        </div>
      </div>

      {/* Search */}
      {bookmarks.length > 0 && (
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <div className="relative">
            <SvgIcon svg={searchSvg} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
            <TextInput
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search bookmarks..."
              autoFocus
              className="pl-9"
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
