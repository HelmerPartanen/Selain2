import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { m } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { PanelModal } from '@/components/ui/PanelModal'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { TextInput } from '@/components/ui/Input'
import { Text } from '@/components/ui/Text'
import { GroupBox } from '@/components/ui/GroupBox'
import globeSvg from '@/assets/icons/Nature/Globe_Fill.svg?raw'
import searchSvg from '@/assets/icons/Objects/Search.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import counterclockwiseSvg from '@/assets/icons/Arrows/Counterclockwise.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useHistoryStore, type HistoryEntry } from '@/store/historyStore'
import { useTabStore, type ClosedTab } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { simplifyUrl } from '@/utils/urlUtils'
import { navigateActiveTab } from '@/utils/tabUtils'
import { SPRING_LIST } from '@/utils/springs'

const SEARCH_DEBOUNCE_MS = 200

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const HistoryRow = memo(function HistoryRow({
  entry,
  onNavigate,
  onRemove,
  index
}: {
  entry: HistoryEntry
  onNavigate: (url: string) => void
  onRemove: (url: string) => void
  index: number
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false)

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_LIST, delay: index * 0.03 }}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          useTabStore.getState().addTab(entry.url)
          useUIStore.getState().closeHistory()
        } else {
          onNavigate(entry.url)
        }
      }}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault()
          useTabStore.getState().addTab(entry.url)
          useUIStore.getState().closeHistory()
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="relative group flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
    >
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 overflow-hidden z-10">
        {entry.favicon ? (
          <img src={entry.favicon} alt="" className="w-6 h-6" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <SvgIcon svg={globeSvg} size={28} className="text-[var(--app-text-tertiary)]" />
        )}
      </div>
      <div className="flex-1 min-w-0 z-10">
        <div className="text-sm font-medium text-[var(--app-text-primary)] truncate">
          {entry.title || simplifyUrl(entry.url)}
        </div>
        <div className="text-xs text-[var(--app-text-tertiary)] truncate">
          {simplifyUrl(entry.url)}
        </div>
      </div>
      <span className="flex-shrink-0 text-[11px] text-[var(--app-text-tertiary)] z-10">
        {formatTime(entry.timestamp)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        rounded="rounded-lg"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(entry.url)
        }}
        className="z-10 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Remove"
      >
        <SvgIcon svg={trashSvg} size={14} />
      </Button>
    </m.div>
  )
})

const RecentlyClosedRow = memo(function RecentlyClosedRow({
  tab,
  onReopen,
  index
}: {
  tab: ClosedTab
  onReopen: () => void
  index: number
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false)

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_LIST, delay: index * 0.03 }}
      onClick={onReopen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-[var(--app-hover-bg)] cursor-pointer transition-all duration-150"
    >
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 overflow-hidden z-10">
        {tab.favicon ? (
          <img src={tab.favicon} alt="" className="w-6 h-6" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <SvgIcon svg={globeSvg} size={28} className="text-[var(--app-text-tertiary)]" />
        )}
      </div>
      <div className="flex-1 min-w-0 z-10">
        <div className="text-sm font-medium text-[var(--app-text-primary)] truncate">
          {tab.title || simplifyUrl(tab.url)}
        </div>
        <div className="text-xs text-[var(--app-text-tertiary)] truncate">
          {simplifyUrl(tab.url)}
        </div>
      </div>
      <span className="flex-shrink-0 text-[11px] text-[var(--app-accent)] z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        Open
      </span>
    </m.div>
  )
})

function HistoryPanelInner(): React.JSX.Element {
  const closeHistory = useUIStore((s) => s.closeHistory)
  const recentlyClosed = useTabStore((s) => s.recentlyClosed)
  const reopenClosedAt = useTabStore((s) => s.reopenClosedAt)
  const entries = useHistoryStore((s) => s.entries)
  const getGrouped = useHistoryStore((s) => s.getGrouped)
  const searchFn = useHistoryStore((s) => s.search)
  const removeEntry = useHistoryStore((s) => s.removeEntry)
  const clearAll = useHistoryStore((s) => s.clearAll)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [renderLimit, setRenderLimit] = useState(120)

  // Debounce search query to reduce O(n) filter calls
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const grouped = useMemo(() => getGrouped(), [getGrouped, entries])
  const searchResults = useMemo(() => 
    debouncedQuery.length >= 2 ? searchFn(debouncedQuery) : null
  , [debouncedQuery, searchFn])
  
  // Incremental rendering: batch grouped history entries to avoid rendering all at once
  const visibleGrouped = useMemo(() => {
    if (!grouped) return []
    const result = []
    let count = 0
    for (const group of grouped) {
      const groupEntries = group.entries.slice(0, Math.max(renderLimit - count, 0))
      result.push({ ...group, entries: groupEntries })
      count += groupEntries.length
      if (count >= renderLimit) break
    }
    return result
  }, [grouped, renderLimit])
  
  const hasMoreHistory = useMemo(() => {
    let count = 0
    for (const group of grouped) {
      count += group.entries.length
    }
    return count > renderLimit
  }, [grouped, renderLimit])

  const handleNavigate = useCallback(
    (url: string) => {
      navigateActiveTab(url)
      closeHistory()
    },
    [closeHistory]
  )

  const handleRemove = useCallback((url: string) => {
    removeEntry(url)
  }, [removeEntry])

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    if (el.scrollTop + el.clientHeight < el.scrollHeight - 200) return
    setRenderLimit((prev) => {
      const totalCount = grouped.reduce((sum, g) => sum + g.entries.length, 0)
      if (prev >= totalCount) return prev
      return Math.min(totalCount, prev + 120)
    })
  }, [grouped])

  // Reset incremental window when query/filter changes
  useEffect(() => {
    setRenderLimit(120)
  }, [query, entries.length])

  const clearButton = entries.length > 0 ? (
    confirmingClear ? (
      <div className="flex items-center gap-1.5">
        <Text as="span" size="caption" tone="muted">Clear all history?</Text>
        <Button
          variant="danger"
          size="xs"
          onClick={() => { clearAll(); setConfirmingClear(false) }}
        >
          Confirm
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setConfirmingClear(false)}
        >
          Cancel
        </Button>
      </div>
    ) : (
      <Button
        variant="ghost"
        size="xs"
        onClick={() => setConfirmingClear(true)}
      >
        Clear all
      </Button>
    )
  ) : undefined

  return (
    <PanelModal
      onClose={closeHistory}
      width="1000px"
      height="650px"
      className="flex flex-col"
    >
      <div className="flex items-center justify-between px-6 pt-3 pb-3 flex-shrink-0">
        <h2 className="text-[15px] font-medium text-[var(--app-text-primary)] tracking-tight flex items-center gap-2">
          <SvgIcon svg={counterclockwiseSvg} size={16} />
          History
        </h2>
        <div className="flex items-center gap-2">
          {clearButton}
          <Button
            variant="icon"
            rounded="rounded-lg"
            onClick={closeHistory}
            aria-label="Close history"
          >
            <SvgIcon svg={closeSvg} size={13} />
          </Button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div className="relative">
            <SvgIcon svg={searchSvg} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-tertiary)]" />
            <TextInput
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search history..."
              autoFocus
              className="rounded-full pl-9"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-3 glass-scroll" onScroll={handleScroll}>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--app-text-tertiary)]">
            <SvgIcon svg={counterclockwiseSvg} size={40} className="mb-3 opacity-50" />
            <p className="text-sm">No history yet</p>
            <p className="text-xs mt-1 opacity-70">Pages you visit will appear here</p>
          </div>
        ) : searchResults ? (
          <div className="space-y-0.5">
            {searchResults.length === 0 ? (
              <p className="text-center text-sm text-[var(--app-text-tertiary)] py-8">No results</p>
            ) : (
              searchResults.slice(0, renderLimit).map((entry, i) => (
                <HistoryRow
                  key={entry.url}
                  entry={entry}
                  onNavigate={handleNavigate}
                  onRemove={handleRemove}
                  index={i}
                />
              ))
            )}
            {searchResults.length > renderLimit && (
              <div className="px-3 py-2 text-xs text-[var(--app-text-tertiary)]">
                Loading more… ({renderLimit}/{searchResults.length})
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {recentlyClosed.length > 0 && (
              <GroupBox title="Recently Closed" contentClassName="space-y-0.5">
                {recentlyClosed.slice(0, 8).map((tab, i) => (
                  <RecentlyClosedRow
                    key={`rc-${i}-${tab.url}`}
                    tab={tab}
                    index={i}
                    onReopen={() => { reopenClosedAt(i); closeHistory() }}
                  />
                ))}
              </GroupBox>
            )}
            {visibleGrouped.map((group) => (
              <GroupBox key={group.label} title={group.label} contentClassName="space-y-0.5">
                {group.entries.map((entry, i) => (
                  <HistoryRow
                    key={`${entry.url}-${entry.timestamp}`}
                    entry={entry}
                    onNavigate={handleNavigate}
                    onRemove={handleRemove}
                    index={i}
                  />
                ))}
              </GroupBox>
            ))}
            {hasMoreHistory && (
              <div className="px-3 py-2 text-xs text-[var(--app-text-tertiary)] text-center">
                Loading more…
              </div>
            )}
          </div>
        )}
      </div>
    </PanelModal>
  )
}

export const HistoryPanel = memo(HistoryPanelInner)
