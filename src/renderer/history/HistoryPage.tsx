import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import globeSvg from '@/assets/icons/Nature/Globe.svg?raw'
import searchSvg from '@/assets/icons/Objects/Search.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import counterclockwiseSvg from '@/assets/icons/Arrows/Counterclockwise.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useHistoryStore, type HistoryEntry } from '@/store/historyStore'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'

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
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {entry.favicon ? (
          <img src={entry.favicon} alt="" className="w-4 h-4" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
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
        <SvgIcon svg={trashSvg} size={14} />
      </button>
    </div>
  )
})

function HistoryPanelInner(): React.JSX.Element {
  const closeHistory = useUIStore((s) => s.closeHistory)
  const entries = useHistoryStore((s) => s.entries)
  const getGrouped = useHistoryStore((s) => s.getGrouped)
  const searchFn = useHistoryStore((s) => s.search)
  const removeEntry = useHistoryStore((s) => s.removeEntry)
  const clearAll = useHistoryStore((s) => s.clearAll)
  const [query, setQuery] = useState('')

  const grouped = getGrouped()
  const searchResults = query.length >= 2 ? searchFn(query) : null

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeHistory()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [closeHistory])

  const handleNavigate = useCallback((url: string) => {
    const store = useTabStore.getState()
    const activeId = store.activeTabId
    if (activeId) {
      store.updateTab(activeId, { url })
    }
    closeHistory()
  }, [closeHistory])

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
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[80] bg-black/30 dark:bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onMouseDown={closeHistory}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-[85] flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-[560px] h-[520px] rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-2xl border border-gray-200/80 dark:border-neutral-700 [app-region:no-drag] pointer-events-auto flex flex-col"
          style={{ transformOrigin: '50% 100%', perspective: 800 }}
          initial={{ y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -20 }}
          animate={{ y: 0, scaleX: 1, scaleY: 1, opacity: 1, rotateX: 0 }}
          exit={{ y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -14 }}
          transition={{ type: 'spring', stiffness: 400, damping: 26, mass: 0.8 }}
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0">
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <SvgIcon svg={counterclockwiseSvg} size={16} />
              History
            </h2>
            <div className="flex items-center gap-2">
              {clearButton}
              <button
                onClick={closeHistory}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-150"
              >
                <SvgIcon svg={closeSvg} size={13} />
              </button>
            </div>
          </div>

          {entries.length > 0 && (
            <div className="px-6 pt-4 pb-2 flex-shrink-0">
              <div className="relative">
                <SvgIcon svg={searchSvg} size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search history..."
                  autoFocus
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-gray-100 dark:bg-neutral-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 outline-none border border-transparent focus:border-blue-500/30 transition-colors duration-150"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-neutral-600">
                <SvgIcon svg={counterclockwiseSvg} size={40} className="mb-3 opacity-50" />
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
          </div>
        </motion.div>
      </div>
    </>
  )
}

export const HistoryPanel = memo(HistoryPanelInner)
