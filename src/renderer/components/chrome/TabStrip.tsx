// ─── TabStrip ────────────────────────────────────────────────────────────────
//
// Inline horizontal tab strip that lives on the chrome row.
//   - Active tab: subtle glass pill, no border
//   - Inactive: text only, no background
//   - Close button (`×`) appears on hover, animates in
//   - When tab count > VISIBLE_TABS, strip becomes scrollable
//   - New-tab `+` button is always visible at the end
//
// Designed to be visually "invisible" when not interacted with — content first,
// chrome last.

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon, SPINNER_SVG } from '@/components/ui/SvgIcon'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import globeSvg from '@/assets/icons/Nature/Globe_fill.svg?raw'
import soundFillSvg from '@/assets/icons/Objects/Sound_Wave_3_Fill.svg?raw'
import splitSvg from '@/assets/icons/Arrows/Triangle_Branch.svg?raw'
import unsplitSvg from '@/assets/icons/Arrows/Triangle_Merge.svg?raw'
import {
  useActiveTabId,
  useSplitTabId,
  useIsSplitView,
  useSpaceTabOrder,
  useTabMeta,
  useTabFaviconState,
} from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'

import { SPRING_FAST, SPRING_SNAPPY, SPRING_EXPAND } from '@/utils/springs'

interface TabStripProps {
  /** Maximum width (in pixels) the strip is allowed to occupy. */
  maxWidth?: number
}

const MIN_TAB_WIDTH = 36
const MAX_TAB_WIDTH = 180
const VISIBLE_TAB_THRESHOLD = 7

function TabItem({
  tabId,
  isActive,
  isSplitTarget,
  isSplit,
  onActivate,
  onClose,
  onSplit,
}: {
  tabId: string
  isActive: boolean
  isSplitTarget: boolean
  isSplit: boolean
  onActivate: () => void
  onClose: () => void
  onSplit: () => void
}): React.JSX.Element {
  const meta = useTabMeta(tabId)
  const faviconState = useTabFaviconState(tabId)
  const title = meta?.title ?? 'New Tab'
  const isPlayingMedia = meta?.isPlayingMedia ?? false
  const isLoading = faviconState?.isLoading ?? false
  const favicon = faviconState?.favicon

  const [hovered, setHovered] = useState(false)

  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 1) {
      // Middle click closes
      e.preventDefault()
      onClose()
    }
  }, [onClose])

  const handleCloseClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    onClose()
  }, [onClose])

  const handleSplitClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    onSplit()
  }, [onSplit])

  const isHighlighted = isActive || isSplitTarget
  const showClose = hovered && !isActive // hide close on active unless hovered
  const showSplit = hovered && !isActive && isSplit === false

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={handleMouseDown}
      style={{ minWidth: MIN_TAB_WIDTH, maxWidth: MAX_TAB_WIDTH }}
      className="relative h-7 flex items-center px-2.5 rounded-full cursor-pointer group select-none flex-shrink-0"
    >
      {/* Active/split-target glass pill */}
      <AnimatePresence>
        {isHighlighted && (
          <motion.div
            layoutId="chrome-tab-highlight"
            className="absolute inset-0 rounded-full glass glass-interactive"
            transition={SPRING_SNAPPY}
          />
        )}
      </AnimatePresence>

      <button
        onClick={onActivate}
        className={`relative z-10 flex items-center gap-1.5 h-full w-full outline-none ${
          isHighlighted
            ? 'text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200'
        }`}
      >
        {/* Favicon / spinner */}
        <span className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
          {isLoading ? (
            <SvgIcon svg={SPINNER_SVG} size={12} className="animate-spin text-gray-400" />
          ) : favicon ? (
            <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-sm" draggable={false} />
          ) : (
            <SvgIcon svg={globeSvg} size={12} className="text-gray-400" />
          )}
        </span>

        {/* Title */}
        <span className="text-[12px] font-normal truncate flex-1 min-w-0">
          {title}
        </span>

        {/* Audio indicator for non-active tabs */}
        {!isActive && isPlayingMedia && !showClose && (
          <SvgIcon svg={soundFillSvg} size={10} className="flex-shrink-0 text-blue-500" />
        )}

        {/* Split target indicator */}
        {isSplitTarget && (
          <SvgIcon svg={splitSvg} size={9} className="flex-shrink-0 text-indigo-500" />
        )}
      </button>

      {/* Hover-only close button (replaces audio icon smoothly) */}
      <AnimatePresence>
        {showClose && (
          <motion.button
            initial={{ scale: 0.5, opacity: 0, width: 0 }}
            animate={{ scale: 1, opacity: 1, width: 14 }}
            exit={{ scale: 0.5, opacity: 0, width: 0 }}
            transition={SPRING_FAST}
            onClick={handleCloseClick}
            aria-label="Close tab"
            className="relative z-10 flex-shrink-0 h-5 w-[14px] flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-neutral-200 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
          >
            <SvgIcon svg={closeSvg} size={9} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Hover-only split button (only when not already in split mode) */}
      <AnimatePresence>
        {showSplit && (
          <motion.button
            initial={{ scale: 0.5, opacity: 0, width: 0 }}
            animate={{ scale: 1, opacity: 1, width: 14 }}
            exit={{ scale: 0.5, opacity: 0, width: 0 }}
            transition={SPRING_FAST}
            onClick={handleSplitClick}
            aria-label="Split view"
            className="relative z-10 flex-shrink-0 h-5 w-[14px] flex items-center justify-center rounded-full text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950"
          >
            <SvgIcon svg={splitSvg} size={9} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

function TabStripInner({ maxWidth = 460 }: TabStripProps): React.JSX.Element {
  const tabOrder = useSpaceTabOrder()
  const activeTabId = useActiveTabId()
  const splitTabId = useSplitTabId()
  const isSplit = useIsSplitView()
  const addTab = useTabStore((s) => s.addTab)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const removeTab = useTabStore((s) => s.removeTab)
  const splitTab = useTabStore((s) => s.splitTab)
  const unsplit = useTabStore((s) => s.unsplit)
  const reorderTab = useTabStore((s) => s.reorderTab)

  const stripRef = useRef<HTMLDivElement>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  // Add tab button + scrollability indicator
  const handleAddTab = useCallback(() => addTab(), [addTab])
  const handleActivate = useCallback((id: string) => setActiveTab(id), [setActiveTab])
  const handleClose = useCallback((id: string) => removeTab(id), [removeTab])
  const handleSplit = useCallback(
    (id: string) => {
      if (isSplit) unsplit()
      else splitTab(id)
    },
    [isSplit, splitTab, unsplit]
  )

  // Drag-and-drop reordering
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggingIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // Firefox requires data
    e.dataTransfer.setData('text/plain', String(index))
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    const from = draggingIndex
    setDraggingIndex(null)
    setDragOverIndex(null)
    if (from !== null && from !== index) {
      reorderTab(from, index)
    }
  }, [draggingIndex, reorderTab])

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null)
    setDragOverIndex(null)
  }, [])

  const tabCount = tabOrder.length
  const scrollable = tabCount > VISIBLE_TAB_THRESHOLD

  return (
    <div
      ref={stripRef}
      className="flex items-center gap-0.5 min-w-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      style={{ maxWidth }}
    >
      {tabOrder.map((id, index) => {
        const isDragTarget = dragOverIndex === index && draggingIndex !== index
        return (
          <motion.div
            key={id}
            layout
            draggable
            onDragStart={(e) => handleDragStart(e as unknown as DragEvent<HTMLDivElement>, index)}
            onDragOver={(e) => handleDragOver(e as unknown as DragEvent<HTMLDivElement>, index)}
            onDrop={(e) => handleDrop(e as unknown as DragEvent<HTMLDivElement>, index)}
            onDragEnd={handleDragEnd}
            animate={{ opacity: draggingIndex === index ? 0.4 : 1 }}
            transition={SPRING_FAST}
            className={`flex-shrink-0 ${isDragTarget ? 'border-l-2 border-indigo-400/60' : ''}`}
          >
            <TabItem
              tabId={id}
              isActive={id === activeTabId}
              isSplitTarget={id === splitTabId}
              isSplit={isSplit}
              onActivate={() => handleActivate(id)}
              onClose={() => handleClose(id)}
              onSplit={() => handleSplit(id)}
            />
          </motion.div>
        )
      })}

      {/* New tab button — always visible */}
      <motion.button
        onClick={handleAddTab}
        aria-label="New tab"
        whileTap={{ scale: 0.82 }}
        transition={SPRING_SNAPPY}
        className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-full text-gray-500 dark:text-neutral-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-gray-800 dark:hover:text-neutral-200 transition-colors duration-100"
      >
        <SvgIcon svg={plusSvg} size={12} />
      </motion.button>

      {/* Spacer indicator for overflow */}
      {scrollable && (
        <span className="text-[10px] text-gray-400 dark:text-neutral-500 px-1 select-none tabular-nums">
          {tabCount}
        </span>
      )}
    </div>
  )
}

export const TabStrip = memo(TabStripInner)
