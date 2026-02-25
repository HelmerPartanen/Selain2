import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import globeSvg from '@/assets/icons/Nature/Globe.svg?raw'
import { useBookmarkStore } from '@/store/bookmarkStore'
import { useTabStore } from '@/store/tabStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useHistoryStore } from '@/store/historyStore'
import { SPRING } from '@/utils/springs'
import { simplifyUrl } from '@/utils/urlUtils'

// ─── Favourites (Bookmarks) ──────────────────────────────────────────────────

function getFaviconUrl(url: string): string {
  try {
    const u = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`
  } catch {
    return ''
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const TILE_W = 80
const TILE_H = 88
const GAP = 8
const COLS = 4

function defaultPosition(index: number): { x: number; y: number } {
  const col = index % COLS
  const row = Math.floor(index / COLS)
  return {
    x: col * (TILE_W + GAP),
    y: row * (TILE_H + GAP)
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function FavouriteTile({
  url,
  hostname,
  faviconUrl,
  index,
  savedPos,
  isSelected,
  onSelect,
  onOpen,
  containerRef
}: {
  url: string
  hostname: string
  faviconUrl: string
  index: number
  savedPos: { x: number; y: number } | undefined
  isSelected: boolean
  onSelect: (url: string) => void
  onOpen: (url: string) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}): React.JSX.Element {
  const setFavouritePosition = useBookmarkStore((s) => s.setFavouritePosition)
  const pos = savedPos ?? defaultPosition(index)
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const hasMoved = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const getContainerBounds = useCallback(() => {
    if (!containerRef.current) return { w: 800, h: 600 }
    return { w: containerRef.current.clientWidth, h: containerRef.current.clientHeight }
  }, [containerRef])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY }
    hasMoved.current = false
  }, [pos.x, pos.y])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return
    const dx = e.clientX - dragStart.current.px
    const dy = e.clientY - dragStart.current.py
    if (!hasMoved.current && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    hasMoved.current = true
    if (!dragging) setDragging(true)
    setDragOffset({ x: dx, y: dy })
  }, [dragging])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (hasMoved.current && dragStart.current) {
      const { w, h } = getContainerBounds()
      const rawX = dragStart.current.x + dragOffset.x
      const rawY = dragStart.current.y + dragOffset.y
      const newX = clamp(rawX, 0, w - TILE_W)
      const newY = clamp(rawY, 0, h - TILE_H)
      setFavouritePosition(url, newX, newY)
    }
    dragStart.current = null
    hasMoved.current = false
    setDragging(false)
    setDragOffset({ x: 0, y: 0 })
  }, [dragOffset, url, setFavouritePosition, getContainerBounds])

  const handleClick = useCallback(() => {
    if (!hasMoved.current) onSelect(url)
  }, [url, onSelect])

  const handleDoubleClick = useCallback(() => {
    onOpen(url)
  }, [url, onOpen])

  const { w: cw, h: ch } = getContainerBounds()
  const displayX = dragging ? clamp(pos.x + dragOffset.x, 0, cw - TILE_W) : pos.x
  const displayY = dragging ? clamp(pos.y + dragOffset.y, 0, ch - TILE_H) : pos.y
  const highlighted = isSelected || dragging

  return (
    <motion.div
      className={`absolute flex flex-col items-center justify-center gap-1.5 rounded-xl
        transition-colors border duration-100 group cursor-default select-none
        ${highlighted
          ? 'bg-white/20 border-neutral-200/50'
          : 'hover:bg-white/10 border-transparent hover:border-neutral-200/20'}
        }`}
      style={{
        width: TILE_W,
        height: TILE_H,
        left: displayX,
        top: displayY,
        zIndex: dragging ? 50 : 1
      }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...SPRING, delay: index * 0.04 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-center justify-center overflow-hidden">
        {faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            className="w-8 h-8 rounded-sm"
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <SvgIcon svg={globeSvg} size={20} className="text-black/40 dark:text-white/40" />
        )}
      </div>
        <span className="text-[11px] font-medium text-white truncate w-full text-center pointer-events-none px-1 [text-shadow:0_0px_2px_rgba(0,0,0,1)]">
        {hostname}
      </span>
    </motion.div>
  )
}

const MemoTile = memo(FavouriteTile)

function Favourites(): React.JSX.Element | null {
  const bookmarks = useBookmarkStore((s) => s.bookmarks)
  const positions = useBookmarkStore((s) => s.favouritePositions)
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const sites = useMemo(
    () =>
      bookmarks.slice(0, 8).map((b) => ({
        url: b.url,
        title: b.title || getHostname(b.url),
        hostname: getHostname(b.url),
        faviconUrl: getFaviconUrl(b.url)
      })),
    [bookmarks]
  )

  const handleNavigate = useCallback((url: string) => {
    const store = useTabStore.getState()
    const activeId = store.activeTabId
    if (activeId) {
      store.updateTab(activeId, { url })
    }
  }, [])

  const handleSelect = useCallback((url: string) => {
    setSelectedUrl((prev) => (prev === url ? null : url))
  }, [])

  const handleDeselect = useCallback(() => {
    setSelectedUrl(null)
  }, [])

  if (sites.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 rounded-2xl"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleDeselect()
      }}
    >
      {sites.map((site, i) => (
        <MemoTile
          key={site.url}
          url={site.url}
          hostname={site.hostname}
          faviconUrl={site.faviconUrl}
          index={i}
          savedPos={positions[site.url]}
          isSelected={selectedUrl === site.url}
          onSelect={handleSelect}
          onOpen={handleNavigate}
          containerRef={containerRef}
        />
      ))}
    </div>
  )
}

function ContinueSection(): React.JSX.Element | null {
  const entries = useHistoryStore((s) => s.entries)
  const items = useMemo(
    () => entries.slice(0, 5),
    [entries]
  )

  const handleNavigate = useCallback((url: string) => {
    const store = useTabStore.getState()
    const activeId = store.activeTabId
    if (activeId) {
      store.updateTab(activeId, { url })
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="mt-6 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white [text-shadow:0_0px_2px_rgba(0,0,0,1)]">
        Continue where you left off
      </div>
      <div className="space-y-1.5">
        {items.map((entry) => (
          <button
            key={`${entry.url}-${entry.timestamp}`}
            onClick={() => handleNavigate(entry.url)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-full glass bg-black/10 hover:bg-black/18 text-left transition-colors duration-120"
          >
            <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              {entry.favicon ? (
                <img src={entry.favicon} alt="" className="w-4 h-4 rounded-sm" />
              ) : (
                <SvgIcon svg={globeSvg} size={14} className="text-white/60" />
              )}
            </span>
            <span className="flex-1 min-w-0 text-[12px] text-white/90 truncate">
              {entry.title || simplifyUrl(entry.url)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function FrequentSection(): React.JSX.Element | null {
  const entries = useHistoryStore((s) => s.entries)
  const items = useMemo(() => {
    if (entries.length === 0) return []
    const byHost = new Map<string, { url: string; visits: number; last: number }>()
    for (const e of entries) {
      let host: string
      try {
        host = new URL(e.url).hostname.replace(/^www\./, '')
      } catch {
        host = e.url
      }
      const existing = byHost.get(host)
      if (!existing) {
        byHost.set(host, { url: e.url, visits: e.visitCount, last: e.timestamp })
      } else {
        existing.visits += e.visitCount
        existing.last = Math.max(existing.last, e.timestamp)
      }
    }
    return Array.from(byHost.entries())
      .sort((a, b) => b[1]!.visits - a[1]!.visits || b[1]!.last - a[1]!.last)
      .slice(0, 6)
  }, [entries])

  const handleNavigate = useCallback((url: string) => {
    const store = useTabStore.getState()
    const activeId = store.activeTabId
    if (activeId) {
      store.updateTab(activeId, { url })
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="mt-6 space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white [text-shadow:0_0px_2px_rgba(0,0,0,1)]">
        Frequent sites
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(([host, data]) => (
          <button
            key={host}
            onClick={() => handleNavigate(data.url)}
            className="px-3 py-1.5 rounded-full glass bg-black/10 hover:bg-black/18 text-[11px] text-white/80 transition-colors duration-120"
          >
            {host}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function NewTabPageInner(): React.JSX.Element {
  const newTabMode = useSettingsStore((s) => s.newTabMode)
  const showNewTabContinueSection = useSettingsStore((s) => s.showNewTabContinueSection)
  const showNewTabFrequentSection = useSettingsStore((s) => s.showNewTabFrequentSection)

  if (newTabMode === 'blank') {
    return (
      <div className="absolute inset-0 flex items-center justify-center select-none">
        <div className="flex flex-col items-center gap-3 opacity-20">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
            <path d="M16 3C16 3 11 10 11 16C11 22 16 29 16 29" stroke="currentColor" strokeWidth="2" />
            <path d="M16 3C16 3 21 10 21 16C21 22 16 29 16 29" stroke="currentColor" strokeWidth="2" />
            <line x1="3" y1="16" x2="29" y2="16" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="text-xs font-medium text-current tracking-wide">Press Ctrl+L to navigate</span>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 select-none">
      {newTabMode === 'bookmarks' && (
        <>
          <Favourites />
          <div className="absolute inset-x-0 bottom-0 p-6 pointer-events-none">
            <div className="max-w-md pointer-events-auto">
              {showNewTabContinueSection && <ContinueSection />}
              {showNewTabFrequentSection && <FrequentSection />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export const NewTabPage = memo(NewTabPageInner)
