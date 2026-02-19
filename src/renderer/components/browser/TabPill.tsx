import { memo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon, SPINNER_SVG } from '@/components/ui/SvgIcon'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import globeSvg from '@/assets/icons/Nature/Globe_fill.svg?raw'
import soundFillSvg from '@/assets/icons/Objects/Sound_Wave_3_Fill.svg?raw'
import splitSvg from '@/assets/icons/Arrows/Triangle_Branch.svg?raw'
import unsplitSvg from '@/assets/icons/Arrows/Triangle_Merge.svg?raw'
import counterclockwiseSvg from '@/assets/icons/Arrows/Counterclockwise.svg?raw'
import { useTabOrder, useActiveTabId, useSplitTabId, useIsSplitView, useTabMeta, useTabFaviconState, useBackgroundMediaPlaying, useSpaceTabOrder } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'

import { SPRING_POPUP, SPRING_FAST, SPRING_SNAPPY, SPRING_EXPAND } from '@/utils/springs'

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
      className={`group flex items-center gap-2.5 w-full px-2.5 h-8 rounded-xl text-left transition-colors duration-75 ${
        isHighlighted
          ? 'bg-black/[0.05] dark:bg-white/[0.08] text-gray-900 dark:text-white'
          : 'text-gray-600 dark:text-neutral-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white'
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
  const tabOrder = useSpaceTabOrder()
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
      <div className="flex items-center glass rounded-full">
        <motion.button
          onClick={handleAddTab}
          aria-label="New tab"
          whileTap={{ scale: 0.82 }}
          transition={SPRING_SNAPPY}
          className="h-10 w-10 flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-100 select-none flex-shrink-0 rounded-full"
        >
          <SvgIcon svg={plusSvg} size={14} />
        </motion.button>

        {tabCount > 1 && (
          <motion.button
            onClick={handleToggle}
            whileTap={{ scale: 0.82 }}
            transition={SPRING_SNAPPY}
            className="flex items-center gap-1.5 h-10 px-3 rounded-full text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-100 whitespace-nowrap flex-shrink-0"
          >
            <ActiveFavicon />
            <span className="text-xs font-medium tabular-nums">
              {tabCount}
            </span>
          </motion.button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isExpanded && tabCount > 1 && (
          <>
            <div className="fixed inset-0 z-[99]" onMouseDown={handleClose} />
            <motion.div
              className="absolute bottom-full left-1/2 -translate-x-1/2 z-[100] min-w-[230px] max-w-[290px]"
              style={{ originX: 0.5, originY: 1 }}
              initial={{
                scaleX: 0.15,
                scaleY: 0.04,
                opacity: 0,
                y: 10,
                borderRadius: 40,
                filter: 'blur(6px)',
              }}
              animate={{
                scaleX: 1,
                scaleY: 1,
                opacity: 1,
                y: 0,
                borderRadius: 16,
                filter: 'blur(0px)',
              }}
              exit={{
                scaleX: 0.15,
                scaleY: 0.04,
                opacity: 0,
                y: 10,
                borderRadius: 40,
                filter: 'blur(6px)',
              }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 28,
                mass: 0.6,
                opacity: { duration: 0.12 },
                filter: { duration: 0.2 },
              }}
            >
              <div className="rounded-2xl glass-heavy overflow-hidden">
                <div className="p-1 max-h-[320px] overflow-y-auto overflow-x-hidden glass-scroll space-y-0.5">
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

                {recentlyClosed.length > 0 && (
                  <>
                    <div className="mx-2 my-1 h-px bg-[var(--border-divider)]" />
                    <button
                      onClick={handleReopen}
                      className="flex items-center gap-2.5 w-full px-2.5 h-8 rounded-lg text-left text-gray-500 dark:text-neutral-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-neutral-300 transition-colors duration-75"
                    >
                      <SvgIcon svg={counterclockwiseSvg} size={13} />
                      <span className="text-xs">Reopen closed tab</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {bgMediaPlaying && (
          <motion.div
            key="bg-audio-badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={SPRING_FAST}
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
