import { memo, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon, SPINNER_SVG } from '@/components/ui/SvgIcon'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import globeSvg from '@/assets/icons/Nature/Globe_fill.svg?raw'
import tabsSvg from '@/assets/icons/Interface/Tabs.svg?raw'
import soundFillSvg from '@/assets/icons/Objects/Sound_Wave_2_Fill.svg?raw'
import soundMuteSvg from '@/assets/icons/Objects/Sound_Mute.svg?raw'
import pinFillSvg from '@/assets/icons/Objects/Pin_Fill.svg?raw'
import splitSvg from '@/assets/icons/Arrows/Triangle_Branch.svg?raw'
import unsplitSvg from '@/assets/icons/Arrows/Triangle_Merge.svg?raw'
import { useShallow } from 'zustand/react/shallow'
import { useTabOrder, useActiveTabId, useSplitTabId, useIsSplitView, useTabMeta, useTabFaviconState, useBackgroundMediaPlaying, useSpaceTabOrder } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'

import { SPRING_POPUP, SPRING_FAST, SPRING_SNAPPY, SPRING_EXPAND } from '@/utils/springs'

const ContextMenuItem = memo(function ContextMenuItem({
  onClick,
  disabled,
  children,
  danger,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3.5 h-9 rounded-lg text-left text-[13px] font-light transition-colors duration-100 ${
        disabled
          ? 'opacity-40 cursor-not-allowed text-gray-700 dark:text-neutral-300'
          : danger
          ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
          : 'text-gray-700 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
      }`}
    >
      {children}
    </button>
  )
})

function TabContextMenu({ tabId, x, y, onClose }: {
  tabId: string
  x: number
  y: number
  onClose: () => void
}) {
  const meta = useTabMeta(tabId)
  const duplicateTab = useTabStore(s => s.duplicateTab)
  const removeTab = useTabStore(s => s.removeTab)
  const toggleMute = useTabStore(s => s.toggleMute)
  const togglePinned = useTabStore(s => s.togglePinned)
  const suspendTab = useTabStore(s => s.suspendTab)
  const pinned = meta?.pinned ?? false
  const isMuted = meta?.isMuted ?? false
  const isPlayingMedia = meta?.isPlayingMedia ?? false

  useEffect(() => {
    const handler = () => onClose()
    window.addEventListener('mousedown', handler, true)
    return () => window.removeEventListener('mousedown', handler, true)
  }, [onClose])

  const safeX = Math.min(x, window.innerWidth - 200)
  const safeY = Math.min(y, window.innerHeight - 248)

  return (
    <div
      className="fixed z-[200] min-w-[190px] rounded-xl overflow-hidden drop-shadow-lg bg-white dark:bg-[#1D1F23] border border-black/5 dark:border-white/5 p-1"
      style={{ top: Math.max(8, safeY), left: Math.max(8, safeX) }}
      onMouseDown={e => e.stopPropagation()}
    >
      <ContextMenuItem onClick={() => { duplicateTab(tabId); onClose() }}>
        Duplicate Tab
      </ContextMenuItem>
      <ContextMenuItem onClick={() => { togglePinned(tabId); onClose() }}>
        {pinned ? 'Unpin Tab' : 'Pin Tab'}
      </ContextMenuItem>
      {(isPlayingMedia || isMuted) && (
        <ContextMenuItem onClick={() => { toggleMute(tabId); onClose() }}>
          {isMuted ? 'Unmute Tab' : 'Mute Tab'}
        </ContextMenuItem>
      )}
      <ContextMenuItem onClick={() => { suspendTab(tabId, 'manual'); onClose() }}>
        Sleep Tab
      </ContextMenuItem>
      <div className="mx-2 my-1 h-px bg-black/5 dark:bg-white/5" />
      <ContextMenuItem
        onClick={() => { removeTab(tabId); onClose() }}
        disabled={pinned}
        danger
      >
        Close Tab
      </ContextMenuItem>
    </div>
  )
}

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
  onSelect,
  onContextMenu,
}: {
  tabId: string
  isActive: boolean
  isSplitTarget: boolean
  isSplit: boolean
  index: number
  onSelect: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const meta = useTabMeta(tabId)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const removeTab = useTabStore((s) => s.removeTab)
  const splitTab = useTabStore((s) => s.splitTab)
  const unsplit = useTabStore((s) => s.unsplit)
  const toggleMute = useTabStore((s) => s.toggleMute)

  const title = meta?.title ?? 'New Tab'
  const favicon = meta?.favicon
  const isLoading = meta?.isLoading ?? false
  const isPlayingMedia = meta?.isPlayingMedia ?? false
  const isMuted = meta?.isMuted ?? false
  const pinned = meta?.pinned ?? false

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
      // Check current state in callback to avoid dependency on prop changes
      if (isSplitTarget) {
        unsplit()
      } else {
        splitTab(tabId)
      }
    },
    [tabId, splitTab, unsplit]
  )

  const isHighlighted = isActive || isSplitTarget

  return (
    <button
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e) }}
      className={`relative group flex items-center gap-3 w-full px-3.5 h-10 rounded-xl text-left transition-all duration-150 font-light ${
        isHighlighted
          ? 'text-gray-900 dark:text-white bg-black/[0.04] dark:bg-white/[0.06]'
          : 'text-gray-700 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
      }`}
      style={{
        opacity: 0,
        animation: `menu-item-in 160ms ease-out ${50 + index * 20}ms forwards`
      }}
    >

      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center z-10">
        {isLoading ? (
          <SvgIcon svg={SPINNER_SVG} size={16} className="animate-spin text-gray-400" />
        ) : favicon ? (
          <img src={favicon} alt="" className="w-4 h-4 rounded-sm" draggable={false} />
        ) : (
          <SvgIcon svg={globeSvg} size={16} className="text-gray-400" />
        )}
      </div>

      <span className="flex-1 text-[13px] truncate z-10">{title}</span>

      {isSplitTarget && (
        <SvgIcon svg={splitSvg} size={11} className="flex-shrink-0 text-blue-500 z-10" />
      )}

      {(isPlayingMedia || isMuted) && (
        <div
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full cursor-pointer z-10 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors duration-100"
          onClick={(e) => { e.stopPropagation(); toggleMute(tabId) }}
          title={isMuted ? 'Unmute tab' : 'Mute tab'}
        >
          <SvgIcon svg={isMuted ? soundMuteSvg : soundFillSvg} size={12} />
        </div>
      )}

      {/* Split/unsplit action — shown when not the active tab */}
      {!isActive && (
        <div
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors duration-100 z-10"
          onClick={handleSplit}
          title={isSplitTarget ? 'Unsplit' : (isSplit ? 'Replace split' : 'Split view')}
        >
          <SvgIcon svg={isSplitTarget ? unsplitSvg : splitSvg} size={11} />
        </div>
      )}

      {pinned && (
        <SvgIcon svg={pinFillSvg} size={10} className="flex-shrink-0 text-amber-500 dark:text-amber-400 z-10 opacity-70" />
      )}
      <div
        className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-colors duration-100 z-10 ${
          pinned
            ? 'text-gray-300 dark:text-neutral-600 cursor-not-allowed'
            : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
        }`}
        onClick={pinned ? undefined : handleClose}
        title={pinned ? 'Unpin to close' : 'Close tab'}
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
  const bgMediaPlaying = useBackgroundMediaPlaying()
  const { isExpanded, setDropdownOpen } = useUIStore(useShallow((s) => ({
    isExpanded: s.isDropdownOpen,
    setDropdownOpen: s.setDropdownOpen,
  })))
  const tabCount = tabOrder.length
  const tabsButtonAction = useSettingsStore((s) => s.tabsButtonAction)
  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects)
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)

  useEffect(() => {
    if (tabCount <= 1) setDropdownOpen(false)
  }, [tabCount, setDropdownOpen])

  const handleAddTab = useCallback(() => addTab(), [addTab])
  const handleToggle = useCallback(() => setDropdownOpen(!isExpanded), [isExpanded, setDropdownOpen])
  const handleClose = useCallback(() => setDropdownOpen(false), [setDropdownOpen])

  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null)

  return (
    <div className="relative">
      <div className="flex items-center rounded-full">
        <motion.button
          onClick={handleAddTab}
          aria-label="New tab"
          whileTap={{ scale: 0.82 }}
          transition={SPRING_SNAPPY}
          className="h-10 w-10 flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-100 select-none flex-shrink-0 rounded-full"
        >
          <SvgIcon svg={plusSvg} size={14} />
        </motion.button>

        <motion.button
          onClick={() => {
            if (tabsButtonAction === 'menu') {
              setDropdownOpen(!isExpanded)
            } else {
              useUIStore.getState().toggleTabOverview()
            }
          }}
          aria-label={tabsButtonAction === 'menu' ? 'Tab list' : 'Tab overview'}
          whileTap={{ scale: 0.82 }}
          transition={SPRING_SNAPPY}
          className="h-10 w-10 flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-100 select-none flex-shrink-0 rounded-full"
        >
          <div className="relative">
            <SvgIcon svg={tabsSvg} size={16}/>
            {tabCount > 1 && (
              <span className="absolute -top-2 -right-2 min-w-[14px] h-3.5 bg-blue-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none pointer-events-none">
                {tabCount > 99 ? '99+' : tabCount}
              </span>
            )}
          </div>
        </motion.button>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isExpanded && tabCount > 1 && (
          <>
            <div className="fixed inset-0 z-[99]" onMouseDown={handleClose} />
            <motion.div
              className="absolute bottom-full left-1/2 -translate-x-1/2 z-[100] min-w-[230px] max-w-[290px] mb-2"
              style={{ originX: 0.5, originY: 1 }}
              initial={disableAnimations ? undefined : {
                scaleX: 0.15,
                scaleY: 0.04,
                opacity: 0,
                y: 10,
                borderRadius: 40,
                filter: disableBlurEffects ? 'none' : 'blur(6px)',
              }}
              animate={{
                scaleX: 1,
                scaleY: 1,
                opacity: 1,
                y: 0,
                borderRadius: 16,
                filter: disableBlurEffects ? 'none' : 'blur(0px)',
              }}
              exit={disableAnimations ? undefined : {
                scaleX: 0.15,
                scaleY: 0.04,
                opacity: 0,
                y: 10,
                borderRadius: 40,
                filter: disableBlurEffects ? 'none' : 'blur(6px)',
              }}
              transition={disableAnimations ? { duration: 0 } : {
                type: 'spring',
                stiffness: 380,
                damping: 28,
                mass: 0.6,
                opacity: { duration: 0.12 },
                filter: { duration: 0.2 },
              }}
            >
              <div className={`rounded-xl drop-shadow-lg overflow-hidden ${disableBlurEffects ? 'bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10' : 'bg-white dark:bg-[#1D1F23] border border-black/5 dark:border-white/5'}`}>
                <div className="p-1 max-h-[320px] overflow-y-auto flex flex-col gap-1">
                  {tabOrder.map((id, index) => (
                    <TabRow
                      key={id}
                      tabId={id}
                      isActive={id === activeTabId}
                      isSplitTarget={id === splitTabId}
                      isSplit={isSplit}
                      index={index}
                      onSelect={handleClose}
                      onContextMenu={(e) => setContextMenu({ tabId: id, x: e.clientX, y: e.clientY })}
                    />
                  ))}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {contextMenu && (
        <TabContextMenu
          tabId={contextMenu.tabId}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}

      <AnimatePresence initial={false}>
        {bgMediaPlaying && (
          <motion.div
            key="bg-audio-badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={SPRING_FAST}
            className="absolute -top-1 -right-1 z-[101] w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-md pointer-events-none"
          >
            <SvgIcon svg={soundFillSvg} size={14} className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

export const TabPill = memo(TabPillInner)
