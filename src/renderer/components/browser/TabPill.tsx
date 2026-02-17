import { memo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon, SPINNER_SVG } from '@/components/ui/SvgIcon'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import globeSvg from '@/assets/icons/Nature/Globe_fill.svg?raw'
import soundFillSvg from '@/assets/icons/Objects/Sound_Fill.svg?raw'
import splitSvg from '@/assets/icons/Arrows/Left_Line_Right_Outside_Fill.svg?raw'
import unsplitSvg from '@/assets/icons/Arrows/Left_Line_Right_Inside_Fill.svg?raw'
import counterclockwiseSvg from '@/assets/icons/Arrows/Counterclockwise.svg?raw'
import { useTabOrder, useActiveTabId, useSplitTabId, useIsSplitView, useTabMeta, useTabFaviconState, useBackgroundMediaPlaying } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'

const springDropdown = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.7 }
const springExpand = { type: 'spring' as const, stiffness: 500, damping: 26, mass: 0.6 }
const springPop = { type: 'spring' as const, stiffness: 400, damping: 26, mass: 0.7 }

function ActiveFavicon(): React.JSX.Element {
  const activeTabId = useActiveTabId()
  const state = useTabFaviconState(activeTabId ?? '')
  const favicon = state?.favicon
  const isLoading = state?.isLoading ?? false

  if (isLoading) {
    return <SvgIcon svg={SPINNER_SVG} size={14} className="animate-spin text-gray-400" />
  }
  if (favicon) {
    return <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-sm" draggable={false} />
  }
  return <SvgIcon svg={globeSvg} size={14} className="text-gray-400" />
}

const TabRow = memo(function TabRow({
  tabId,
  isActive,
  isSplitTarget,
  isSplit,
  index,
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
      style={{
        opacity: 0,
        animation: `menu-item-in 180ms ease-out ${60 + index * 25}ms forwards`
      }}
    >
      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
        {isLoading ? (
          <SvgIcon svg={SPINNER_SVG} size={13} className="animate-spin text-gray-400" />
        ) : favicon ? (
          <img src={favicon} alt="" className="w-4 h-4 rounded-sm" draggable={false} />
        ) : (
          <SvgIcon svg={globeSvg} size={13} className="text-gray-400" />
        )}
      </div>

      <span className="flex-1 text-xs truncate">{title}</span>

      {isSplitTarget && (
        <SvgIcon svg={splitSvg} size={11} className="flex-shrink-0 text-indigo-500" />
      )}

      {!isHighlighted && isPlayingMedia && (
        <SvgIcon svg={soundFillSvg} size={12} className="flex-shrink-0 text-blue-500" />
      )}

      {/* Split/unsplit action — shown when not the active tab */}
      {!isActive && (
        <div
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors duration-100"
          onClick={handleSplit}
          title={isSplitTarget ? 'Unsplit' : (isSplit ? 'Replace split' : 'Split view')}
        >
          <SvgIcon svg={isSplitTarget ? unsplitSvg : splitSvg} size={11} />
        </div>
      )}

      <div
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors duration-100"
        onClick={handleClose}
      >
        <SvgIcon svg={closeSvg} size={11} />
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
            {/* Click-away */}
            <div className="fixed inset-0 z-[99]" onMouseDown={handleClose} />
            <motion.div
              className="absolute bottom-full mb-2 right-0 rounded-xl overflow-hidden z-[100] min-w-[230px] max-w-[290px] bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-xl"
              style={{ originX: 0.5, originY: 1, perspective: 600 }}
              initial={{ scaleX: 0.3, scaleY: 0.08, opacity: 0, y: 32, rotateX: -16 }}
              animate={{ scaleX: 1, scaleY: 1, opacity: 1, y: 0, rotateX: 0 }}
              exit={{ scaleX: 0.3, scaleY: 0.06, opacity: 0, y: 28, rotateX: -10 }}
              transition={{ ...springDropdown, opacity: { duration: 0.1 } }}
            >
              <div className="p-1 max-h-[320px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1 space-y-0.5">
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
                    <SvgIcon svg={counterclockwiseSvg} size={13} />
                    <span className="text-xs">Reopen closed tab</span>
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div
        className="flex items-center bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg rounded-full overflow-visible"
      >
        <motion.button
          onClick={handleAddTab}
          aria-label="New tab"
          whileTap={{ scale: 0.82 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className={`h-10 flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors duration-100 select-none flex-shrink-0 ${tabCount > 1 ? 'rounded-l-full px-4' : 'rounded-full w-10'}`}
        >
          <SvgIcon svg={plusSvg} size={18} />
        </motion.button>

        <AnimatePresence initial={false}>
          {tabCount > 1 && (
            <motion.div
              key="tab-counter"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{
                width: { type: 'spring', stiffness: 500, damping: 32, mass: 0.6 },
                opacity: { duration: 0.12 }
              }}
              className="flex items-center"
              style={{ overflow: 'hidden', flexShrink: 0 }}
            >
              <div className="w-px h-5 bg-gray-200 dark:bg-neutral-700 flex-shrink-0" />
              <motion.button
                onClick={handleToggle}
                animate={{ scale: isExpanded ? 0.92 : 1 }}
                whileTap={{ scale: 0.82 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="flex items-center gap-1.5 h-10 pr-3.5 pl-2.5 rounded-r-full text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-100 whitespace-nowrap"
              >
                <ActiveFavicon />
                <span className="text-xs font-medium tabular-nums">
                  {tabCount}
                </span>
              </motion.button>
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
            transition={springPop}
            className="absolute -top-1 -right-1 z-[101] w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-md ring-2 ring-white dark:ring-neutral-900 pointer-events-none"
          >
            <SvgIcon svg={soundFillSvg} size={10} className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

export const TabPill = memo(TabPillInner)
