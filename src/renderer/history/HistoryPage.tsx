import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { m } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { PanelModal } from '@/components/ui/PanelModal'
import { PanelHeader, EmptyState } from '@/components/ui/PanelParts'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { TextInput } from '@/components/ui/Input'
import { Text } from '@/components/ui/Text'
import { GroupBox } from '@/components/ui/GroupBox'
import globeSvg from '@/assets/icons/Nature/Globe_Fill.svg?raw'
import searchSvg from '@/assets/icons/Objects/Search.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import counterclockwiseSvg from '@/assets/icons/Arrows/Counterclockwise.svg?raw'
import { useHistoryStore, type HistoryEntry } from '@/store/historyStore'
import { useTabStore, type ClosedTab } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { simplifyUrl } from '@/utils/urlUtils'
import { navigateActiveTab } from '@/utils/tabUtils'

const SEARCH_DEBOUNCE_MS = 200

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const HistoryRow = memo(function HistoryRow({
  entry,
  onNavigate,
  onRemove,
}: {
  entry: HistoryEntry
  onNavigate: (url: string) => void
  onRemove: (url: string) => void
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          useTabStore.getState().addTabInCurrentContext(entry.url)
          useUIStore.getState().closeHistory()
        } else {
          onNavigate(entry.url)
        }
      }}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault()
          useTabStore.getState().addTabInCurrentContext(entry.url)
          useUIStore.getState().closeHistory()
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="relative group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-100 hover:bg-[var(--app-control-hover)] focus-visible:bg-[var(--app-control-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
    >
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 overflow-hidden z-10">
        {entry.favicon ? (
          <img src={entry.favicon} alt="" className="w-6 h-6" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <SvgIcon svg={globeSvg} size={24} className="text-[var(--app-text-tertiary)]" />
        )}
      </div>
      <div className="flex-1 min-w-0 z-10">
        <Text as="div" size="body" tone="primary" className="truncate font-medium">
          {entry.title || simplifyUrl(entry.url)}
        </Text>
        <Text as="div" size="caption" tone="muted" className="truncate">
          {simplifyUrl(entry.url)}
        </Text>
      </div>
      <Text as="span" size="caption" tone="muted" className="z-10 flex-shrink-0 text-[11px]">
        {formatTime(entry.timestamp)}
      </Text>
      <Button
        variant="ghost"
        size="icon-sm"
        rounded="rounded-lg"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(entry.url)
        }}
        className="z-10 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label="Remove history item"
      >
        <SvgIcon svg={trashSvg} size={14} />
      </Button>
    </button>
  )
})

const RecentlyClosedRow = memo(function RecentlyClosedRow({
  tab,
  onReopen,
}: {
  tab: ClosedTab
  onReopen: () => void
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={onReopen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-100 hover:bg-[var(--app-control-hover)] focus-visible:bg-[var(--app-control-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
    >
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 overflow-hidden z-10">
        {tab.favicon ? (
          <img src={tab.favicon} alt="" className="w-6 h-6" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <SvgIcon svg={globeSvg} size={24} className="text-[var(--app-text-tertiary)]" />
        )}
      </div>
      <div className="flex-1 min-w-0 z-10">
        <Text as="div" size="body" tone="primary" className="truncate font-medium">
          {tab.title || simplifyUrl(tab.url)}
        </Text>
        <Text as="div" size="caption" tone="muted" className="truncate">
          {simplifyUrl(tab.url)}
        </Text>
      </div>
      <Text as="span" size="caption" tone="accent" className="z-10 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        Open
      </Text>
    </button>
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
      <PanelHeader
        icon={counterclockwiseSvg}
        title="History"
        onClose={closeHistory}
        closeLabel="Close history"
        actions={clearButton}
      />

      {entries.length > 0 && (
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div className="relative">
            <SvgIcon svg={searchSvg} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-text-tertiary)]" />
            <TextInput
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search history"
              autoFocus
              className="rounded-full pl-9"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-3 glass-scroll" onScroll={handleScroll}>
        {entries.length === 0 ? (
          <EmptyState
            icon={counterclockwiseSvg}
            title="No history yet"
            description="Pages you visit will appear here."
          />
        ) : searchResults ? (
          <div className="space-y-0.5">
            {searchResults.length === 0 ? (
              <Text size="body" tone="muted" className="py-8 text-center">
                No results
              </Text>
            ) : (
              searchResults.slice(0, renderLimit).map((entry) => (
                <HistoryRow
                  key={entry.url}
                  entry={entry}
                  onNavigate={handleNavigate}
                  onRemove={handleRemove}
                />
              ))
            )}
            {searchResults.length > renderLimit && (
              <Text size="caption" tone="muted" className="px-3 py-2">
                Loading more ({renderLimit}/{searchResults.length})
              </Text>
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
                    onReopen={() => { reopenClosedAt(i); closeHistory() }}
                  />
                ))}
              </GroupBox>
            )}
            {visibleGrouped.map((group) => (
              <GroupBox key={group.label} title={group.label} contentClassName="space-y-0.5">
                {group.entries.map((entry) => (
                  <HistoryRow
                    key={`${entry.url}-${entry.timestamp}`}
                    entry={entry}
                    onNavigate={handleNavigate}
                    onRemove={handleRemove}
                  />
                ))}
              </GroupBox>
            ))}
            {hasMoreHistory && (
              <Text size="caption" tone="muted" className="px-3 py-2 text-center">
                Loading more
              </Text>
            )}
          </div>
        )}
      </div>
    </PanelModal>
  )
}

export const HistoryPanel = memo(HistoryPanelInner)
