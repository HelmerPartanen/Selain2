import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { m } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import dottSvg from '@/assets/icons/Interface/Dott.svg?raw'
import { useBookmarkStore } from '@/store/bookmarkStore'
import { useTabStore } from '@/store/tabStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useHistoryStore } from '@/store/historyStore'
import { useUIStore } from '@/store/uiStore'
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
  onOpenInNewTab,
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
  onOpenInNewTab?: (url: string) => void
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
    // Capture current position at drag start time
    dragStart.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY }
    hasMoved.current = false
  }, [])

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
    setDragOffset((currentOffset) => {
      if (hasMoved.current && dragStart.current) {
        const { w, h } = getContainerBounds()
        const rawX = dragStart.current.x + currentOffset.x
        const rawY = dragStart.current.y + currentOffset.y
        const newX = clamp(rawX, 0, w - TILE_W)
        const newY = clamp(rawY, 0, h - TILE_H)
        setFavouritePosition(url, newX, newY)
      }
      dragStart.current = null
      hasMoved.current = false
      setDragging(false)
      return { x: 0, y: 0 }
    })
  }, [url, setFavouritePosition, getContainerBounds])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        onOpenInNewTab?.(url)
        return
      }
      if (!hasMoved.current) onOpen(url)
    },
    [url, onOpen, onOpenInNewTab]
  )

  const handleAuxClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault()
        onOpenInNewTab?.(url)
      }
    },
    [url, onOpenInNewTab]
  )

  const { w: cw, h: ch } = getContainerBounds()
  const displayX = dragging ? clamp(pos.x + dragOffset.x, 0, cw - TILE_W) : pos.x
  const displayY = dragging ? clamp(pos.y + dragOffset.y, 0, ch - TILE_H) : pos.y
  const highlighted = isSelected || dragging

  return (
    <m.div
      className={`absolute flex flex-col items-center justify-center gap-1.5 rounded-xl
        transition-colors border duration-100 group cursor-default select-none
        ${highlighted
          ? 'bg-[var(--app-bg-tertiary)] border-[var(--app-separator)]'
          : 'hover:bg-[var(--app-control-hover)] border-transparent hover:border-[var(--app-separator)]'}
        }`}
      style={{
        width: TILE_W,
        height: TILE_H,
        left: dragging ? pos.x : displayX,
        top: dragging ? pos.y : displayY,
        transform: dragging
          ? `translate3d(${displayX - pos.x}px, ${displayY - pos.y}px, 0)`
          : undefined,
        willChange: dragging ? 'transform' : undefined,
        zIndex: dragging ? 50 : 1
      }}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onAuxClick={handleAuxClick}
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
          <SvgIcon svg={dottSvg} size={20} className="text-black dark:text-white" />
        )}
      </div>
        <span className="text-[11px] font-medium text-[var(--app-text-secondary)] truncate w-full text-center pointer-events-none px-1">
        {hostname}
      </span>
    </m.div>
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

  const handleOpenInNewTab = useCallback((url: string) => {
    useTabStore.getState().addTabInCurrentContext(url)
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
          onOpenInNewTab={handleOpenInNewTab}
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

  const handleOpenInNewTab = useCallback((url: string) => {
    useTabStore.getState().addTabInCurrentContext(url)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="mt-6 space-y-2">
      <div className="text-[12px] font-medium text-[var(--app-text-secondary)]">
        Recent pages
      </div>
      <div className="space-y-1.5">
        {items.map((entry) => (
          <button
            key={`${entry.url}-${entry.timestamp}`}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                handleOpenInNewTab(entry.url)
                return
              }
              handleNavigate(entry.url)
            }}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault()
                handleOpenInNewTab(entry.url)
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)] hover:bg-[var(--app-control-hover)] text-left transition-colors duration-150"
          >
            <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              {entry.favicon ? (
                <img src={entry.favicon} alt="" className="w-4 h-4 rounded-sm" />
              ) : (
                <SvgIcon svg={dottSvg} size={14} className="text-[var(--app-text-tertiary)]" />
              )}
            </span>
            <span className="flex-1 min-w-0 text-[12px] text-[var(--app-text-primary)] truncate">
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

  const handleOpenInNewTab = useCallback((url: string) => {
    useTabStore.getState().addTabInCurrentContext(url)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="mt-6 space-y-2">
      <div className="text-[12px] font-medium text-[var(--app-text-secondary)]">
        Frequent sites
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(([host, data]) => (
          <button
            key={host}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                handleOpenInNewTab(data.url)
                return
              }
              handleNavigate(data.url)
            }}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault()
                handleOpenInNewTab(data.url)
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)] hover:bg-[var(--app-control-hover)] text-[11px] text-[var(--app-text-secondary)] transition-colors duration-150"
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
