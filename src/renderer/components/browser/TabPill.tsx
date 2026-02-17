import { memo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, X, Globe, CircleNotch, SpeakerHigh, SplitHorizontal, ArrowCounterClockwise } from '@phosphor-icons/react'
import { useTabOrder, useActiveTabId, useSplitTabId, useIsSplitView, useTabMeta, useTabFaviconState, useBackgroundMediaPlaying } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'

const springDropdown = { type: 'spring' as const, stiffness: 400, damping: 24, mass: 0.7 }
const springCounter = { type: 'spring' as const, stiffness: 500, damping: 24, mass: 0.6 }

function ActiveFavicon(): React.JSX.Element {
  const activeTabId = useActiveTabId()
  const state = useTabFaviconState(activeTabId ?? '')
  const favicon = state?.favicon
  const isLoading = state?.isLoading ?? false

  if (isLoading) {
    return <CircleNotch size={14} className="animate-spin text-gray-400" weight="bold" />
  }
  if (favicon) {
    return <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-sm" draggable={false} />
  }
  return <Globe size={14} className="text-gray-400" weight="regular" />
}

const TabRow = memo(function TabRow({
  tabId,
  isActive,
  isSplitTarget,
  isSplit,
  onSelect
}: {
  tabId: string
  isActive: boolean
  isSplitTarget: boolean
  isSplit: boolean
  index: number
  onSelect: () => void
}): React.JSX.Element {
  const meta = useTabMeta(tabId)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const removeTab = useTabStore((s) => s.removeTab)
  const splitTab = useTabStore((s) => s.splitTab)
  const unsplit = useTabStore((s) => s.unsplit)

  const title = meta?.title ?? 'New Tab'
  const favicon = meta?.favicon
  const isLoading = meta?.isLoading ?? false
  const isPlayingMedia = meta?.isPlayingMedia ?? false

  const handleClick = useCallback(() => {
    setActiveTab(tabId)
    onSelect()
  }, [tabId, setActiveTab, onSelect])

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      removeTab(tabId)
    },
    [tabId, removeTab]
  )

  const handleSplit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isSplitTarget) {
        unsplit()
      } else {
        splitTab(tabId)
      }
    },
    [tabId, splitTab, unsplit, isSplitTarget]
  )

  const isHighlighted = isActive || isSplitTarget

  return (
    <button
      onClick={handleClick}
      className={`group flex items-center gap-2.5 w-full px-2.5 h-8 rounded-lg text-left transition-colors duration-100 ${
        isHighlighted
          ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white'
          : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
        {isLoading ? (
          <CircleNotch size={13} className="animate-spin text-gray-400" weight="bold" />
        ) : favicon ? (
          <img src={favicon} alt="" className="w-4 h-4 rounded-sm" draggable={false} />
        ) : (
          <Globe size={13} className="text-gray-400" weight="regular" />
        )}
      </div>

      <span className="flex-1 text-xs truncate">{title}</span>

      {isSplitTarget && (
        <SplitHorizontal size={11} weight="bold" className="flex-shrink-0 text-indigo-500" />
      )}

      {!isHighlighted && isPlayingMedia && (
        <SpeakerHigh size={12} weight="fill" className="flex-shrink-0 text-blue-500" />
      )}

      {/* Split/unsplit action — shown when not the active tab */}
      {!isActive && (
        <div
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors duration-100"
          onClick={handleSplit}
          title={isSplitTarget ? 'Unsplit' : (isSplit ? 'Replace split' : 'Split view')}
        >
          <SplitHorizontal size={11} weight="bold" />
        </div>
      )}

      <div
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors duration-100"
        onClick={handleClose}
      >
        <X size={11} weight="bold" />
      </div>
    </button>
  )
})

function TabPillInner(): React.JSX.Element {
  const tabOrder = useTabOrder()
  const activeTabId = useActiveTabId()
  const splitTabId = useSplitTabId()
  const isSplit = useIsSplitView()
  const addTab = useTabStore((s) => s.addTab)
  const reopenLastClosed = useTabStore((s) => s.reopenLastClosed)
  const recentlyClosed = useTabStore((s) => s.recentlyClosed)
  const bgMediaPlaying = useBackgroundMediaPlaying()
  const isExpanded = useUIStore((s) => s.isDropdownOpen)
  const setDropdownOpen = useUIStore((s) => s.setDropdownOpen)
  const tabCount = tabOrder.length

  useEffect(() => {
    if (tabCount <= 1) setDropdownOpen(false)
  }, [tabCount, setDropdownOpen])

  const handleAddTab = useCallback(() => addTab(), [addTab])
  const handleToggle = useCallback(() => setDropdownOpen(!isExpanded), [isExpanded, setDropdownOpen])
  const handleClose = useCallback(() => setDropdownOpen(false), [setDropdownOpen])
  const handleReopen = useCallback(() => {
    reopenLastClosed()
  }, [reopenLastClosed])

  return (
    <div className="relative">
      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div
              className="absolute bottom-full mb-2 right-0 rounded-xl overflow-hidden z-[100] min-w-[230px] max-w-[290px] p-1 bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-xl"
              style={{ originX: 0.85, originY: 1, perspective: 600 }}
              initial={{ scaleX: 0.45, scaleY: 0.2, opacity: 0, y: 22, rotateX: -10 }}
              animate={{ scaleX: 1, scaleY: 1, opacity: 1, y: 0, rotateX: 0 }}
              exit={{ scaleX: 0.55, scaleY: 0.18, opacity: 0, y: 16, rotateX: -6 }}
              transition={{ ...springDropdown, opacity: { duration: 0.12 } }}
            >
              <div className="max-h-[320px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1 space-y-0.5">
                {tabOrder.map((id, index) => (
                  <TabRow
                    key={id}
                    tabId={id}
                    isActive={id === activeTabId}
                    isSplitTarget={id === splitTabId}
                    isSplit={isSplit}
                    index={index}
                    onSelect={handleClose}
                  />
                ))}
              </div>

              {/* Reopen last closed */}
              {recentlyClosed.length > 0 && (
                <>
                  <div className="mx-2 my-1 h-px bg-gray-100 dark:bg-neutral-800" />
                  <button
                    onClick={handleReopen}
                    className="flex items-center gap-2.5 w-full px-2.5 h-8 rounded-lg text-left text-gray-500 dark:text-neutral-500 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors duration-100"
                  >
                    <ArrowCounterClockwise size={13} weight="regular" />
                    <span className="text-xs">Reopen closed tab</span>
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div
        className="relative flex items-center justify-center bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg rounded-full p-1.5 gap-0.5 overflow-visible"
      >
        <Button variant="icon" onClick={handleAddTab} aria-label="New tab">
          <Plus size={15} weight="bold" />
        </Button>

        <AnimatePresence initial={false}>
          {tabCount > 1 && (
            <motion.div
              key="tab-counter"
              initial={{ width: 0, opacity: 0, scale: 0.3 }}
              animate={{ width: 52, opacity: 1, scale: 1 }}
              exit={{ width: 0, opacity: 0, scale: 0.3 }}
              transition={springCounter}
              style={{ overflow: 'hidden', flexShrink: 0 }}
            >
              <button
                onClick={handleToggle}
                className="flex items-center gap-1.5 h-7 w-[52px] px-2 rounded-full text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 active:bg-gray-200 dark:active:bg-neutral-700"
              >
                <ActiveFavicon />
                <span className="text-xs font-medium tabular-nums whitespace-nowrap">
                  {tabCount}
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {bgMediaPlaying && (
          <motion.div
            key="bg-audio-badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={springCounter}
            className="absolute -top-1 -right-1 z-[101] w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-md ring-2 ring-white dark:ring-neutral-900 pointer-events-none"
          >
            <SpeakerHigh size={10} weight="fill" className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

export const TabPill = memo(TabPillInner)
