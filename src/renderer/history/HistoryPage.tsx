import { memo, useCallback, useState } from 'react'
import { Globe, MagnifyingGlass, Trash, ClockCounterClockwise } from '@phosphor-icons/react'
import { useHistoryStore, type HistoryEntry } from '@/store/historyStore'
import { useTabStore } from '@/store/tabStore'
import { InternalPageLayout } from '@/components/layout/InternalPageLayout'

function simplifyUrl(raw: string): string {
  try {
    const u = new URL(raw)
    return u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname)
  } catch {
    return raw
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const HistoryRow = memo(function HistoryRow({
  entry,
  onNavigate,
  onRemove
}: {
  entry: HistoryEntry
  onNavigate: (url: string) => void
  onRemove: (url: string) => void
}): React.JSX.Element {
  return (
    <div
      onClick={() => onNavigate(entry.url)}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800/60 transition-colors duration-100"
    >
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
        <Globe size={16} className="text-gray-400 dark:text-neutral-500" weight="regular" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {entry.title || simplifyUrl(entry.url)}
        </div>
        <div className="text-xs text-gray-500 dark:text-neutral-500 truncate">
          {simplifyUrl(entry.url)}
        </div>
      </div>
      <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-neutral-600 tabular-nums">
        {formatTime(entry.timestamp)}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(entry.url)
        }}
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-100"
        aria-label="Remove"
      >
        <Trash size={14} weight="regular" />
      </button>
    </div>
  )
})

function HistoryPageInner(): React.JSX.Element {
  const entries = useHistoryStore((s) => s.entries)
  const getGrouped = useHistoryStore((s) => s.getGrouped)
  const searchFn = useHistoryStore((s) => s.search)
  const removeEntry = useHistoryStore((s) => s.removeEntry)
  const clearAll = useHistoryStore((s) => s.clearAll)
  const [query, setQuery] = useState('')

  const grouped = getGrouped()
  const searchResults = query.length >= 2 ? searchFn(query) : null

  const handleNavigate = useCallback((url: string) => {
    const store = useTabStore.getState()
    const activeId = store.activeTabId
    if (activeId) {
      store.updateTab(activeId, { url })
    }
  }, [])

  const handleRemove = useCallback((url: string) => {
    removeEntry(url)
  }, [removeEntry])

  const clearButton = entries.length > 0 ? (
    <button
      onClick={clearAll}
      className="text-xs text-gray-500 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-100 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
    >
      Clear all
    </button>
  ) : undefined

  return (
    <InternalPageLayout title="History" actions={clearButton}>
      {entries.length > 0 && (
        <div className="relative mb-6">
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" weight="regular" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search history..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-gray-100 dark:bg-neutral-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 outline-none border border-transparent focus:border-blue-500/30 transition-colors duration-150"
          />
        </div>
      )}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-neutral-600">
          <ClockCounterClockwise size={40} weight="regular" className="mb-3 opacity-50" />
          <p className="text-sm">No history yet</p>
          <p className="text-xs mt-1 opacity-70">Pages you visit will appear here</p>
        </div>
      ) : searchResults ? (
        <div className="space-y-0.5">
          {searchResults.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-neutral-600 py-8">No results</p>
          ) : (
            searchResults.map((entry) => (
              <HistoryRow
                key={entry.url}
                entry={entry}
                onNavigate={handleNavigate}
                onRemove={handleRemove}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600 mb-2 px-3">
                {group.label}
              </h2>
              <div className="space-y-0.5">
                {group.entries.map((entry) => (
                  <HistoryRow
                    key={`${entry.url}-${entry.timestamp}`}
                    entry={entry}
                    onNavigate={handleNavigate}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </InternalPageLayout>
  )
}

export const HistoryPage = memo(HistoryPageInner)
