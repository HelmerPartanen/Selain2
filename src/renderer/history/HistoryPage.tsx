import { memo, useCallback, useState } from 'react'
import { motion } from 'motion/react'
import { PanelModal } from '@/components/ui/PanelModal'
import { SvgIcon } from '@/components/ui/SvgIcon'
import globeSvg from '@/assets/icons/Nature/Globe_Fill.svg?raw'
import searchSvg from '@/assets/icons/Objects/Search.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import counterclockwiseSvg from '@/assets/icons/Arrows/Counterclockwise.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useHistoryStore, type HistoryEntry } from '@/store/historyStore'
import { useUIStore } from '@/store/uiStore'
import { simplifyUrl } from '@/utils/urlUtils'
import { navigateActiveTab } from '@/utils/tabUtils'
import { SPRING_SNAPPY, SPRING_LIST } from '@/utils/springs'

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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_LIST, delay: index * 0.03 }}
      onClick={() => onNavigate(entry.url)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="relative group flex items-center gap-3 px-3 py-1.5 rounded-full cursor-pointer hover:scale-105 transition-all duration-150"
    >
      {hovered && (
        <motion.div
          layoutId="history-hover"
          className="absolute inset-0 rounded-full glass bg-white/20 dark:bg-white/6 shadow ring-1 ring-black/5 dark:ring-white/10"
          initial={{ opacity: 0.5, filter: 'blur(2px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(2px)' }}
          transition={SPRING_SNAPPY}
        />
      )}
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 overflow-hidden z-10">
        {entry.favicon ? (
          <img src={entry.favicon} alt="" className="w-6 h-6" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
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
      <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-neutral-600 z-10">
        {formatTime(entry.timestamp)}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(entry.url)
        }}
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-150 z-10"
        aria-label="Remove"
      >
        <SvgIcon svg={trashSvg} size={14} />
      </button>
    </motion.div>
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
  const [confirmingClear, setConfirmingClear] = useState(false)

  const grouped = getGrouped()
  const searchResults = query.length >= 2 ? searchFn(query) : null

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

  const clearButton = entries.length > 0 ? (
    confirmingClear ? (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 dark:text-neutral-400">Clear all history?</span>
        <button
          onClick={() => { clearAll(); setConfirmingClear(false) }}
          className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-100"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirmingClear(false)}
          className="text-xs text-gray-500 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-100"
        >
          Cancel
        </button>
      </div>
    ) : (
      <button
        onClick={() => setConfirmingClear(true)}
        className="text-xs text-gray-500 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-100 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        Clear all
      </button>
    )
  ) : undefined

  return (
    <PanelModal
      onClose={closeHistory}
      width="560px"
      height="520px"
      className="flex flex-col"
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 className="text-[15px] font-medium text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <SvgIcon svg={counterclockwiseSvg} size={16} />
              History
            </h2>
            <div className="flex items-center gap-2">
              {clearButton}
              <motion.button
                onClick={closeHistory}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                transition={SPRING_SNAPPY}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-150"
              >
                <SvgIcon svg={closeSvg} size={13} />
              </motion.button>
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
                  className="w-full h-9 pl-9 pr-3 rounded-full bg-black/[0.03] dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 outline-none border border-transparent focus:border-indigo-500/30 transition-all duration-150"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-3 glass-scroll">
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
                  searchResults.map((entry, i) => (
                    <HistoryRow
                      key={entry.url}
                      entry={entry}
                      onNavigate={handleNavigate}
                      onRemove={handleRemove}
                      index={i}
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
                      {group.entries.map((entry, i) => (
                        <HistoryRow
                          key={`${entry.url}-${entry.timestamp}`}
                          entry={entry}
                          onNavigate={handleNavigate}
                          onRemove={handleRemove}
                          index={i}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>
    </PanelModal>
  )
}

export const HistoryPanel = memo(HistoryPanelInner)
