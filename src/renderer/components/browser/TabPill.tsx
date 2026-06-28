import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { SvgIcon, SPINNER_SVG } from '@/components/ui/SvgIcon'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import privateSvg from '@/assets/icons/Interface/Private.svg?raw'
import globeSvg from '@/assets/icons/Nature/Globe_fill.svg?raw'
import newTabFavicon from '@/assets/icons/Interface/Dott.svg'
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

import { SPRING_FAST, SPRING_SNAPPY, SPRING_EXPAND } from '@/utils/springs'

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
    <Button
      variant="ghost"
      size="none"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`h-9 w-full justify-start gap-2.5 rounded-lg px-3.5 text-left text-[13px] font-light ${
        disabled
          ? 'opacity-40 cursor-not-allowed text-[var(--app-text-tertiary)]'
          : danger
            ? 'text-[var(--app-danger)] hover:text-[var(--app-danger)] hover:bg-[var(--app-danger-bg)]'
            : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-control-hover)]'
      }`}
    >
      {children}
    </Button>
  )
})

export function TabContextMenu({ tabId, x, y, onClose }: {
  tabId: string
  x: number
  y: number
  onClose: () => void
}) {
  const meta = useTabMeta(tabId)
  const tabOrder = useTabOrder()
  const activeTabId = useActiveTabId()
  const duplicateTab = useTabStore(s => s.duplicateTab)
  const removeTab = useTabStore(s => s.removeTab)
  const toggleMute = useTabStore(s => s.toggleMute)
  const togglePinned = useTabStore(s => s.togglePinned)
  const suspendTab = useTabStore(s => s.suspendTab)
  const splitTab = useTabStore(s => s.splitTab)
  const unsplit = useTabStore(s => s.unsplit)
  const isSuspended = useTabStore(s => s.tabs[tabId]?.isSuspended ?? false)
  const splitTabId = useSplitTabId()
  const pinned = meta?.pinned ?? false
  const isMuted = meta?.isMuted ?? false
  const isPlayingMedia = meta?.isPlayingMedia ?? false
  const menuRef = useRef<HTMLDivElement | null>(null)
  const isActive = activeTabId === tabId
  const canClose = !pinned || tabOrder.length <= 1
  const canSuspend = !isActive && !isSuspended
  const isSplitTarget = splitTabId === tabId

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (target && menuRef.current?.contains(target)) return
      onClose()
    }
    window.addEventListener('mousedown', handler, true)
    const keyHandler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', keyHandler, true)
    return () => {
      window.removeEventListener('mousedown', handler, true)
      window.removeEventListener('keydown', keyHandler, true)
    }
  }, [onClose])

  const safeX = Math.max(8, Math.min(x, window.innerWidth - 220))
  const safeY = Math.max(8, Math.min(y, window.innerHeight - 300))

  const runAction = (action: () => void): void => {
    action()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[110]"
      onMouseDown={onClose}
    >
      <m.div
        ref={menuRef}
        className="absolute w-[212px] rounded-xl border border-[var(--app-separator)] bg-[var(--app-bg-tertiary)] p-1 text-[var(--app-text-primary)] shadow-sm"
        style={{ left: safeX, top: safeY, transformOrigin: 'top left' }}
        initial={{ opacity: 0, scale: 0.96, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -4 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        onMouseDown={(event) => event.stopPropagation()}
        role="menu"
        aria-label="Tab actions"
      >
        <ContextMenuItem onClick={() => runAction(() => useTabStore.getState().setActiveTab(tabId))}>
          <SvgIcon svg={tabsSvg} size={14} />
          Switch to tab
        </ContextMenuItem>
        <ContextMenuItem onClick={() => runAction(() => duplicateTab(tabId))}>
          <SvgIcon svg={plusSvg} size={14} />
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem onClick={() => runAction(() => togglePinned(tabId))}>
          <SvgIcon svg={pinFillSvg} size={14} />
          {pinned ? 'Unpin tab' : 'Pin tab'}
        </ContextMenuItem>

        <div className="my-1 h-px bg-[var(--app-separator)]" />

        {(isPlayingMedia || isMuted) && (
          <ContextMenuItem onClick={() => runAction(() => toggleMute(tabId))}>
            <SvgIcon svg={isMuted ? soundFillSvg : soundMuteSvg} size={14} />
            {isMuted ? 'Unmute tab' : 'Mute tab'}
          </ContextMenuItem>
        )}
        <ContextMenuItem
          onClick={() =>
            runAction(() => {
              if (isSplitTarget) unsplit()
              else splitTab(tabId)
            })
          }
          disabled={isActive && !isSplitTarget}
        >
          <SvgIcon svg={isSplitTarget ? unsplitSvg : splitSvg} size={14} />
          {isSplitTarget ? 'Remove from split view' : 'Open in split view'}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => runAction(() => suspendTab(tabId, 'manual'))}
          disabled={!canSuspend}
        >
          <SvgIcon svg={globeSvg} size={14} />
          Sleep tab
        </ContextMenuItem>

        <div className="my-1 h-px bg-[var(--app-separator)]" />

        <ContextMenuItem
          onClick={() => runAction(() => removeTab(tabId))}
          disabled={!canClose}
          danger
        >
          <SvgIcon svg={closeSvg} size={14} />
          Close tab
        </ContextMenuItem>
      </m.div>
    </div>
  )
}

function ActiveFavicon(): React.JSX.Element {
  const activeTabId = useActiveTabId()
  const state = useTabFaviconState(activeTabId ?? '')
  const favicon = state?.favicon
  const isLoading = state?.isLoading ?? false
  const isNewTabFavicon = favicon === newTabFavicon

  if (isLoading) {
    return <SvgIcon svg={SPINNER_SVG} size={14} className="animate-spin text-[var(--app-text-tertiary)]" />
  }
  if (favicon) {
    return <img src={favicon} alt="" className={`w-3.5 h-3.5 rounded-sm ${isNewTabFavicon ? 'dark:invert' : ''}`} draggable={false} />
  }
  return <SvgIcon svg={globeSvg} size={14} className="text-[var(--app-text-tertiary)]" />
}

export const TabRow = memo(function TabRow({
  tabId,
  isActive,
  isSplitTarget,
  isSplit,
  onSelect,
  onContextMenu,
}: {
  tabId: string
  isActive: boolean
  isSplitTarget: boolean
  isSplit: boolean
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
  const isNewTabFavicon = favicon === newTabFavicon
  const isLoading = meta?.isLoading ?? false
  const isPlayingMedia = meta?.isPlayingMedia ?? false
  const isMuted = meta?.isMuted ?? false
  const pinned = meta?.pinned ?? false
  const isPrivate = meta?.isPrivate ?? false

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
    <Button
      variant="ghost"
      size="none"
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e) }}
      className={`relative group flex h-10 w-full items-center justify-start gap-3 rounded-lg px-3.5 text-left font-light transition-colors duration-150 ${
        isHighlighted
          ? 'text-[var(--app-text-primary)] bg-[var(--app-control-active)]'
          : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-control-hover)]'
      }`}
    >

      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center z-10">
        {isLoading ? (
          <SvgIcon svg={SPINNER_SVG} size={16} className="animate-spin text-[var(--app-text-tertiary)]" />
        ) : favicon ? (
          <img src={favicon} alt="" className={`w-4 h-4 rounded-sm ${isNewTabFavicon ? 'dark:invert' : ''}`} draggable={false} />
        ) : (
          <SvgIcon svg={globeSvg} size={16} className="text-[var(--app-text-tertiary)]" />
        )}
      </div>

      <span className="flex-1 text-[13px] truncate z-10">{title}</span>

      {isPrivate && (
        <SvgIcon svg={privateSvg} size={12} className="flex-shrink-0 text-[var(--app-text-tertiary)] z-10" />
      )}

      {isSplitTarget && (
        <SvgIcon svg={splitSvg} size={11} className="flex-shrink-0 text-[var(--app-accent)] z-10" />
      )}

      {(isPlayingMedia || isMuted) && (
        <div
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer z-10 text-[var(--app-accent)] hover:bg-[var(--app-control-hover)] transition-colors duration-100"
          onClick={(e) => { e.stopPropagation(); toggleMute(tabId) }}
          title={isMuted ? 'Unmute tab' : 'Mute tab'}
        >
          <SvgIcon svg={isMuted ? soundMuteSvg : soundFillSvg} size={12} />
        </div>
      )}

      {/* Split/unsplit action — shown when not the active tab */}
      {!isActive && (
        <div
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 cursor-pointer text-[var(--app-text-tertiary)] hover:text-[var(--app-accent)] hover:bg-[var(--app-control-hover)] transition-colors duration-100 z-10"
          onClick={handleSplit}
          title={isSplitTarget ? 'Remove split' : (isSplit ? 'Replace split tab' : 'Open in split view')}
          aria-label={isSplitTarget ? 'Remove from split view' : (isSplit ? 'Replace split tab' : 'Open in split view')}
        >
          <SvgIcon svg={isSplitTarget ? unsplitSvg : splitSvg} size={11} />
        </div>
      )}

      {pinned && (
        <SvgIcon svg={pinFillSvg} size={10} className="flex-shrink-0 text-[var(--app-accent)] z-10 opacity-70" />
      )}
      <div
        className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md opacity-60 group-hover:opacity-100 cursor-pointer transition-colors duration-100 z-10 ${
          pinned
            ? 'text-[var(--app-text-tertiary)] cursor-not-allowed'
            : 'text-[var(--app-text-tertiary)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)]'
        }`}
        onClick={pinned ? undefined : handleClose}
        title={pinned ? 'Pinned tabs stay open' : 'Close tab'}
        aria-label={pinned ? 'Pinned tab cannot be closed' : 'Close tab'}
      >
        <SvgIcon svg={closeSvg} size={11} />
      </div>
    </Button>
  )
})

function TabPillInner(): React.JSX.Element {
  const tabOrder = useSpaceTabOrder()
  const activeTabId = useActiveTabId()
  const splitTabId = useSplitTabId()
  const isSplit = useIsSplitView()
  const addTabInCurrentContext = useTabStore((s) => s.addTabInCurrentContext)
  const bgMediaPlaying = useBackgroundMediaPlaying()
  const { isExpanded, setDropdownOpen } = useUIStore(useShallow((s) => ({
    isExpanded: s.isDropdownOpen,
    setDropdownOpen: s.setDropdownOpen,
  })))
  const tabCount = tabOrder.length
  const tabsButtonAction = useSettingsStore((s) => s.tabsButtonAction)
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)

  useEffect(() => {
    if (tabCount <= 1) setDropdownOpen(false)
  }, [tabCount, setDropdownOpen])

  const handleAddTab = useCallback(() => addTabInCurrentContext(), [addTabInCurrentContext])
  const handleToggle = useCallback(() => setDropdownOpen(!isExpanded), [isExpanded, setDropdownOpen])
  const handleClose = useCallback(() => setDropdownOpen(false), [setDropdownOpen])

  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null)

  return (
    <div className="relative h-full">
      <div className="flex items-center h-full rounded-full">
        <Button
          variant="ghost"
          size="none"
          onClick={handleAddTab}
          aria-label="New tab"
          className="h-full aspect-square flex items-center justify-center text-[var(--app-text-secondary)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)] transition-all duration-100 select-none flex-shrink-0 rounded-lg"
        >
          <SvgIcon svg={plusSvg} size={14} />
        </Button>

        <Button
          variant="ghost"
          size="none"
          onClick={() => {
            if (tabsButtonAction === 'menu') {
              setDropdownOpen(!isExpanded)
            } else {
              useUIStore.getState().toggleTabOverview()
            }
          }}
          aria-label={tabsButtonAction === 'menu' ? 'Tab list' : 'Tab overview'}
          className="h-full aspect-square flex items-center justify-center text-[var(--app-text-secondary)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)] transition-all duration-100 select-none flex-shrink-0 rounded-lg"
        >
          <div className="relative">
        <div style={{ display: 'flex' }}>
            <SvgIcon svg={tabsSvg} size={16}/>
            </div>
            {tabCount > 1 && (
              <span className="absolute -top-2 -right-2 min-w-[14px] h-3.5 bg-[var(--app-accent)] text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none pointer-events-none">
                {tabCount > 99 ? '99+' : tabCount}
              </span>
            )}
          </div>
        </Button>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isExpanded && tabCount > 1 && (
          <>
            <div className="fixed inset-0 z-[99]" onMouseDown={handleClose} />
            <m.div
              className="absolute bottom-full left-1/2 -translate-x-1/2 z-[100] min-w-[230px] max-w-[290px] mb-2"
              style={{ originX: 0.5, originY: 1 }}
              initial={disableAnimations ? undefined : {
                opacity: 0,
                y: 8,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={disableAnimations ? undefined : {
                opacity: 0,
                y: 8,
                scale: 0.98,
              }}
              transition={disableAnimations ? { duration: 0 } : {
                duration: 0.12,
                ease: 'easeOut',
              }}
            >
              <div className="rounded-xl shadow-sm overflow-hidden bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)] text-[var(--app-text-primary)]">
                <div className="p-1 max-h-[320px] overflow-y-auto flex flex-col gap-1">
                  {tabOrder.map((id) => (
                    <TabRow
                      key={id}
                      tabId={id}
                      isActive={id === activeTabId}
                      isSplitTarget={id === splitTabId}
                      isSplit={isSplit}
                      onSelect={handleClose}
                      onContextMenu={(e) => setContextMenu({ tabId: id, x: e.clientX, y: e.clientY })}
                    />
                  ))}
                </div>

              </div>
            </m.div>
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
          <m.div
            key="bg-audio-badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={SPRING_FAST}
            className="absolute -top-0.5 -right-0.5 z-[101] w-5 h-5 rounded-full bg-[var(--app-accent)] flex items-center justify-center shadow-md pointer-events-none"
          >
            <SvgIcon svg={soundFillSvg} size={14} className="text-white" />
          </m.div>
        )}
      </AnimatePresence>

    </div>
  )
}

export const TabPill = memo(TabPillInner)
