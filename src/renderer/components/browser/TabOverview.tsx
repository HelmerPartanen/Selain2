import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { SvgIcon, SPINNER_SVG } from '@/components/ui/SvgIcon'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/Search'
import globeSvg from '@/assets/icons/Nature/Globe_Fill.svg?raw'
import newTabFavicon from '@/assets/icons/Interface/Dott.svg'
import soundFillSvg from '@/assets/icons/Objects/Sound_Fill.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import privateSvg from '@/assets/icons/Interface/Private.svg?raw'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import tabsSvg from '@/assets/icons/Interface/Tabs.svg?raw'
import folderSvg from '@/assets/icons/Objects/Folder.svg?raw'
import bedSvg from '@/assets/icons/Objects/Bed.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import chevronDownSvg from '@/assets/icons/Arrows/Chevron_Down.svg?raw'
import checkSvg from '@/assets/icons/Interface/Check.svg?raw'
import { useShallow } from 'zustand/react/shallow'
import { useTabStore, type Tab } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useAccountStore, type AccountSpace } from '@/store/accountStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { NewTabPage } from '@/newtab/NewTabPage'
import { SPRING } from '@/utils/springs'
import { findDuplicateTabIds } from '@/utils/tabAnalysis'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TabPreview {
  id: string
  title: string
  url: string
  favicon: string
  isLoading: boolean
  isPlayingMedia: boolean
  thumbnail: string | null
  spaceName: string
  accountName: string
  isDuplicate: boolean
  pinned: boolean
  isSuspended: boolean
  isPrivate: boolean
}

const MAX_THUMBNAIL_CAPTURES = 16
const CAPTURE_GAP_MS = 30

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

// ─── New Tab Placeholder ─────────────────────────────────────────────────────

const NEWTAB_GRADIENT =
  'linear-gradient(135deg, var(--app-bg-secondary) 0%, var(--app-bg-tertiary) 100%)'

// ─── TabCard ─────────────────────────────────────────────────────────────────

const TabCard = memo(function TabCard({
  preview,
  isActive,
  canClose,
  isSelected,
  disableAnimations,
  onSelect,
  onClose,
  onToggleSelected
}: {
  preview: TabPreview
  isActive: boolean
  canClose: boolean
  isSelected: boolean
  disableAnimations: boolean
  onSelect: () => void
  onClose: (e: React.MouseEvent) => void
  onToggleSelected: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const { thumbnail } = preview
  const isNewTab = preview.url === 'browser://newtab'
  const isNewTabFavicon = preview.favicon === newTabFavicon
  const title = preview.title || 'New Tab'

  return (
    <m.div
      layout={!disableAnimations}
      className="group relative tab-overview-card"
      style={{ animationDelay: disableAnimations ? undefined : '0ms' }}
      exit={disableAnimations ? undefined : { scale: 0.8, opacity: 0 }}
      transition={disableAnimations ? { duration: 0 } : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <m.button
        onClick={onSelect}
        whileTap={{ scale: 0.99 }}
        className={`
          relative w-full rounded-lg overflow-hidden text-left transition-shadow duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
          ${isActive
            ? 'ring-2 ring-blue-500 shadow-xl'
            : isSelected
              ? 'ring-2 ring-blue-500 shadow-xl'
              : 'ring-1 ring-gray-200 dark:ring-neutral-700 shadow-lg hover:shadow-xl hover:ring-blue-400/50 dark:hover:ring-blue-500/40'
          }
        `}
        style={{
          transformOrigin: 'center',
          transition: 'box-shadow 200ms ease, ring-color 200ms ease, transform 200ms ease',
        }}
      >
        {/* Thumbnail area */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-top"
              draggable={false}
            />
          ) : isNewTab ? (
            <ErrorBoundary
              fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--app-bg-secondary)]">
                  <div className="text-center">
                    <div className="text-[11px] text-[var(--app-text-secondary)]">
                      Failed to load page
                    </div>
                  </div>
                </div>
              }
            >
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="pointer-events-none select-none"
                  style={{
                    width: '1280px',
                    height: '800px',
                    transform: 'scale(0.203125)',
                    transformOrigin: 'top left',
                  }}
                >
                  <NewTabPage />
                </div>
              </div>
            </ErrorBoundary>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--app-bg-secondary)]">
              <SvgIcon svg={globeSvg} size={28} className="text-[var(--app-text-tertiary)]" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 group-hover:bg-black/20 transition-colors duration-150" />
          <Button
            variant="ghost"
            size="none"
            onClick={(e) => {
              // If user is not in select-mode, keep old behavior (toggle selection, but don’t activate/close)
              e.stopPropagation()
              onToggleSelected(e)
            }}
            className={`absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-colors transition-transform duration-200 ${
              isSelected ? '!bg-blue-500' : '!bg-transparent'
            }`}
            aria-label={isSelected ? 'Deselect tab' : 'Select tab'}
          >
            {isSelected && <SvgIcon svg={checkSvg} size={14} className="text-white" />}
          </Button>
          <div className="absolute top-2 right-2 flex gap-1">
            {preview.pinned && <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[9px]">Pinned</span>}
            {preview.isDuplicate && <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px]">Duplicate</span>}
            {preview.isSuspended && <span className="px-1.5 py-0.5 rounded-full bg-neutral-700 text-white text-[9px]">Sleeping</span>}
          </div>
        </div>
      </m.button>


      {/* Close button — only shown when the tab can be closed */}
      {canClose && (
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="subtle"
            size="xs"
            className="w-6 h-6 items-center justify-center flex"
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            <SvgIcon svg={closeSvg} size={12} />
          </Button>
        </div>
      )}

      {/* Title below card */}
      <div className="flex items-center gap-1.5 mt-2 px-1">
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {preview.isLoading ? (
            <SvgIcon svg={SPINNER_SVG} size={12} className="animate-spin text-[var(--app-text-tertiary)]" />
          ) : preview.favicon ? (
            <img src={preview.favicon} alt="" className={`w-3.5 h-3.5 rounded-sm ${isNewTabFavicon ? 'dark:invert' : ''}`} draggable={false} />
          ) : (
            <SvgIcon svg={globeSvg} size={12} className="text-[var(--app-text-tertiary)]" />
          )}
        </div>
        <span className="flex-1 text-[11px] text-[var(--app-text-secondary)] truncate">{title}</span>
        {preview.isPlayingMedia && (
          <SvgIcon svg={soundFillSvg} size={11} className="flex-shrink-0 text-[var(--app-accent)]" />
        )}
      </div>
    </m.div>
  )
})

// ─── TabOverview ─────────────────────────────────────────────────────────────

function TabOverviewInner(): React.JSX.Element {
  const { isOpen, closeOverview } = useUIStore(useShallow((s) => ({
    isOpen: s.isTabOverviewOpen,
    closeOverview: s.closeTabOverview,
  })))
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const isPrivateContext = useTabStore((s) => {
    if (!s.activeTabId) return false
    return s.tabs[s.activeTabId]?.isPrivate ?? false
  })
  const [previews, setPreviews] = useState<TabPreview[]>([])
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelecting, setIsSelecting] = useState(false)
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false)
  const [hoveredMoveSpaceIdx, setHoveredMoveSpaceIdx] = useState<number | null>(null)
  const moveButtonRef = useRef<HTMLButtonElement | null>(null)
  const [moveMenuPos, setMoveMenuPos] = useState({ x: 0, y: 0 })
  const cancelledRef = useRef(false)

  // Snapshot tabs + capture thumbnails when opening; cancel on close
  useEffect(() => {
    if (!isOpen) {
      cancelledRef.current = true
      setPreviews([])
      return
    }
    cancelledRef.current = false

    // Snapshot tab data at open time (decoupled from live `tabs` object)
    const { tabOrder, tabs } = useTabStore.getState()
    const { accounts } = useAccountStore.getState()
    const spaceByTabId = new Map<string, string>()
    const accountByTabId = new Map<string, string>()
    for (const account of Object.values(accounts)) {
      for (const space of Object.values(account.spaces)) {
        for (const tabId of space.tabIds) {
          spaceByTabId.set(tabId, space.name)
          accountByTabId.set(tabId, account.name)
        }
      }
    }
    const visibleTabOrder = tabOrder.filter((id) => {
      const tab = tabs[id]
      return !!tab && tab.isPrivate === isPrivateContext
    })
    const visibleTabs = Object.fromEntries(
      visibleTabOrder
        .map((id) => [id, tabs[id]] as const)
        .filter((entry): entry is [string, Tab] => Boolean(entry[1]))
    )
    const duplicates = findDuplicateTabIds(visibleTabOrder, visibleTabs)
    const snapshots: TabPreview[] = visibleTabOrder
      .map((id) => {
        const tab = tabs[id]
        if (!tab) return null
        return {
          id,
          title: tab.title,
          url: tab.url,
          favicon: tab.favicon,
          isLoading: tab.isLoading,
          isPlayingMedia: tab.isPlayingMedia,
          thumbnail: tab.thumbnail,
          spaceName: spaceByTabId.get(id) ?? 'General',
          accountName: accountByTabId.get(id) ?? 'Personal',
          isDuplicate: duplicates.has(id),
          pinned: tab.pinned,
          isSuspended: tab.isSuspended,
          isPrivate: tab.isPrivate
        } as TabPreview
      })
      .filter(Boolean) as TabPreview[]
    setPreviews(snapshots)

    // We already pulled cached thumbnails for background tabs.
    // Let's only do a live capture for the currently active tab (since it's currently visible and accurate).
    const captureActiveTab = async (): Promise<void> => {
      const currentActiveTabId = useTabStore.getState().activeTabId
      if (!currentActiveTabId) return

      const activeSnapshot = snapshots.find(s => s.id === currentActiveTabId)
      if (!activeSnapshot || activeSnapshot.isPrivate || activeSnapshot.url === 'browser://newtab') return

      if (cancelledRef.current) return
      const thumbnail = await webviewRegistry.capturePage(currentActiveTabId)
      if (cancelledRef.current) return

      if (thumbnail) {
        setPreviews((prev) =>
          prev.map((p) => (p.id === currentActiveTabId ? { ...p, thumbnail } : p))
        )
      }
    }
    captureActiveTab()

    return () => { cancelledRef.current = true }
  }, [isOpen, activeTabId, isPrivateContext])

  const handleSelect = useCallback(
    (tabId: string) => {
      const tab = useTabStore.getState().tabs[tabId]
      if (tab && !tab.isPrivate) {
        const accountStore = useAccountStore.getState()
        if (accountStore.accounts[tab.accountId]) {
          accountStore.switchAccount(tab.accountId)
          accountStore.switchSpace(tab.spaceId)
        }
      }
      useTabStore.getState().setActiveTab(tabId)
      closeOverview()
    },
    [closeOverview]
  )

  const toggleSelecting = useCallback(() => {
    setIsSelecting((v) => {
      const next = !v
      if (!next) setSelectedIds(new Set())
      setIsMoveMenuOpen(false)
      setHoveredMoveSpaceIdx(null)
      return next
    })
  }, [])

  const handleClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation()
      useTabStore.getState().removeTab(tabId)

      // Update previews to reflect removal
      setPreviews((prev) => {
        const next = prev.filter((p) => p.id !== tabId)
        // If no tabs remain after closing, close the overview
        if (next.length === 0) {
          setTimeout(closeOverview, 0)
        }
        return next
      })
    },
    [closeOverview]
  )

  const handleNewTab = useCallback(() => {
    useTabStore.getState().addTabInCurrentContext()
    closeOverview()
  }, [closeOverview])

  const handleExitPrivateMode = useCallback(() => {
    useTabStore.getState().exitPrivateMode()
    closeOverview()
  }, [closeOverview])

  const filteredPreviews = previews.filter((preview) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      preview.title.toLowerCase().includes(q) ||
      preview.url.toLowerCase().includes(q) ||
      preview.spaceName.toLowerCase().includes(q) ||
      preview.accountName.toLowerCase().includes(q)
    )
  })

  const groupedPreviews = filteredPreviews.reduce<Record<string, TabPreview[]>>((acc, preview) => {
    const key = `${preview.accountName} / ${preview.spaceName}`
    acc[key] = [...(acc[key] ?? []), preview]
    return acc
  }, {})
  const moveSpaceOptions = (() => {
    const accountState = useAccountStore.getState()
    const account = accountState.accounts[accountState.activeAccountId]
    if (!account) return []
    return account.spaceOrder
      .map((id) => account.spaces[id])
      .filter((space): space is AccountSpace => Boolean(space))
  })()

  const handleToggleSelected = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(tabId)) next.delete(tabId)
      else next.add(tabId)
      return next
    })
  }, [])

  const handleCloseSelected = useCallback(() => {
    for (const id of selectedIds) useTabStore.getState().removeTab(id)
    setPreviews((prev) => prev.filter((preview) => !selectedIds.has(preview.id)))
    setSelectedIds(new Set())
    setIsMoveMenuOpen(false)
    setIsSelecting(false)
  }, [selectedIds])

  const handleSleepSelected = useCallback(() => {
    for (const id of selectedIds) useTabStore.getState().suspendTab(id, 'cleanup')
    setPreviews((prev) => prev.map((preview) => selectedIds.has(preview.id) ? { ...preview, isSuspended: true } : preview))
    setSelectedIds(new Set())
    setIsMoveMenuOpen(false)
    setIsSelecting(false)
  }, [selectedIds])

  const handleCloseDuplicates = useCallback(() => {
    const duplicates = previews.filter((preview) => preview.isDuplicate)
    for (const preview of duplicates) useTabStore.getState().removeTab(preview.id)
    setPreviews((prev) => prev.filter((preview) => !preview.isDuplicate))
    setSelectedIds(new Set())
    setIsSelecting(false)
  }, [previews])

  const handleMoveSelectedToSpace = useCallback((spaceId: string) => {
    const account = useAccountStore.getState().accounts[useAccountStore.getState().activeAccountId]
    for (const id of selectedIds) {
      useAccountStore.getState().moveTabToSpace(id, spaceId)
      if (account) useTabStore.getState().updateTab(id, { accountId: account.id, spaceId })
    }
    setIsMoveMenuOpen(false)
    setHoveredMoveSpaceIdx(null)
    setSelectedIds(new Set())
    setIsSelecting(false)
  }, [selectedIds])

  const handleSaveSelectedAsSpace = useCallback(() => {
    if (selectedIds.size === 0) return
    const id = useAccountStore.getState().addSpace(`Saved tabs ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 210)
    const account = useAccountStore.getState().accounts[useAccountStore.getState().activeAccountId]
    for (const tabId of selectedIds) {
      useAccountStore.getState().moveTabToSpace(tabId, id)
      if (account) useTabStore.getState().updateTab(tabId, { accountId: account.id, spaceId: id })
    }
    setSelectedIds(new Set())
    setIsSelecting(false)
  }, [selectedIds])

  useEffect(() => {
    if (selectedIds.size === 0) {
      setIsMoveMenuOpen(false)
      setHoveredMoveSpaceIdx(null)
      setIsSelecting(false)
    }
  }, [selectedIds.size])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeOverview()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [isOpen, closeOverview])

  // Close on trackpad pinch out
  useEffect(() => {
    if (!isOpen) return
    const handlePinchOut = (e: WheelEvent) => {
      if (e.ctrlKey && e.deltaY < -20) {
        closeOverview()
      }
    }
    window.addEventListener('wheel', handlePinchOut, { passive: true })
    return () => window.removeEventListener('wheel', handlePinchOut)
  }, [isOpen, closeOverview])

  // Determine if close button should be shown per card
  // Only a single tab on newtab should be un-closable
  const isOnlyTabOnNewTab =
    previews.length === 1 && previews[0]?.url === 'browser://newtab'

  return (
    <AnimatePresence initial={!disableAnimations}>
      {isOpen && (
        <>
          {/* Backdrop — solid overlay */}
          <m.div
            key="tab-overview-backdrop"
            className="fixed inset-0 z-[90] backdrop-blur-lg transition-opacity duration-150"
            style={{ backgroundColor: 'color-mix(in srgb, var(--app-bg-primary) 72%, transparent)' }}
            initial={disableAnimations ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={disableAnimations ? undefined : { opacity: 0 }}
            transition={disableAnimations ? { duration: 0 } : { duration: 0.15 }}
            onClick={closeOverview}
          />

          {/* Content */}
          <m.div
            key="tab-overview-content"
            className="fixed inset-0 z-[95] flex flex-col items-center overflow-y-auto py-12 px-8"
            initial={disableAnimations ? undefined : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={disableAnimations ? undefined : { opacity: 0, y: 24 }}
            transition={disableAnimations ? { duration: 0 } : { ...SPRING, damping: 30, opacity: { duration: 0.15 } }}
            onClick={closeOverview}
          >
            {/* Header */}
            <div className="mb-8 flex flex-col items-center">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-[var(--app-text-primary)] tracking-tight">
                {isPrivateContext && <SvgIcon svg={privateSvg} size={18} />}
                {previews.length} {isPrivateContext ? 'Private' : ''} {previews.length === 1 ? 'Tab' : 'Tabs'} Open
              </h2>
              <div
                className="mt-4 h-[42px] flex flex-wrap items-center justify-center gap-1.5 max-w-[calc(100vw-40px)] rounded-xl px-1.5 py-1 shadow-sm bg-[var(--app-bg-secondary)] border border-[var(--app-separator)] text-[var(--app-text-primary)]"
                onClick={(e) => e.stopPropagation()}
              >
                <SearchInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tabs"
                  containerClassName="h-full w-72 max-w-[calc(100vw-72px)]"
                  clearable
                  onClear={() => setQuery('')}
                />
                <Button
                  variant="ghost"
                  size="none"
                  onClick={toggleSelecting}
                  whileTap={{ scale: 0.96 }}
                  className="h-full px-3 rounded-lg flex items-center gap-2 text-[var(--app-text-secondary)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)] transition-[background-color,color] duration-150 select-none"
                  title={isSelecting ? 'Exit selection' : 'Select tabs'}
                  aria-label={isSelecting ? 'Exit selection mode' : 'Enter selection mode'}
                  style={{
                    background: isSelecting ? 'var(--app-control-active)' : undefined,
                  }}
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    <SvgIcon svg={checkSvg} size={14} className={isSelecting ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-secondary)]'} />
                  </span>
                  <span className="text-[12px] font-medium">Select</span>
                </Button>
                {selectedIds.size > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="none"
                      onClick={handleSleepSelected}
                      className="h-full px-3 rounded-lg flex items-center gap-2 text-[var(--app-text-secondary)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)] transition-[background-color,color] duration-150 select-none"
                      title={`Sleep ${selectedIds.size} selected`}
                    >
                      <SvgIcon svg={bedSvg} size={14} />
                      <span className="text-[12px]">Sleep {selectedIds.size}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="none"
                      onClick={handleCloseSelected}
                      className="h-full px-3 rounded-lg flex items-center gap-2 text-[var(--app-danger)] hover:bg-[var(--app-danger-bg)] transition-[background-color] duration-100 select-none"
                      title={`Close ${selectedIds.size} selected`}
                    >
                      <SvgIcon svg={trashSvg} size={14} />
                      <span className="text-[12px]">Close {selectedIds.size}</span>
                    </Button>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="none"
                        onClick={() => setIsMoveMenuOpen((open) => !open)}
                        className="h-[32px] px-3 rounded-lg flex items-center gap-2 text-[var(--app-text-secondary)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)] transition-[background-color,color] duration-150 select-none"
                        title="Move selected tabs to space"
                        aria-label="Move selected tabs to space"
                        aria-expanded={isMoveMenuOpen}
                      >
                        <SvgIcon svg={folderSvg} size={14} />
                        <span className="text-[12px]">Move</span>
                        <span className="flex h-4 w-4 items-center justify-center">
                          <SvgIcon svg={chevronDownSvg} size={11} />
                        </span>
                      </Button>
                      <AnimatePresence>
                        {isMoveMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-[99]" onMouseDown={() => setIsMoveMenuOpen(false)} />
                            <m.div
                              className="absolute top-full left-1/2 z-[110] mt-2 min-w-[220px]"
                              style={{ originX: 0.5, originY: 0, x: '-50%' }}
                              initial={disableAnimations ? undefined : {
                                scale: 0.98,
                                opacity: 0,
                                y: -8,
                              }}
                              animate={{
                                scale: 1,
                                opacity: 1,
                                y: 0,
                              }}
                              exit={disableAnimations ? undefined : {
                                scale: 0.98,
                                opacity: 0,
                                y: -8,
                              }}
                              transition={disableAnimations ? { duration: 0 } : {
                                duration: 0.12,
                                ease: 'easeOut',
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <div className="rounded-xl shadow-sm overflow-hidden bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)] text-[var(--app-text-primary)]">
                                <div className="p-0 relative">
                                  {moveSpaceOptions.map((space, idx) => (
                                    <Button
                                      variant="ghost"
                                      size="none"
                                      key={space.id}
                                      onClick={() => handleMoveSelectedToSpace(space.id)}
                                      onMouseEnter={() => setHoveredMoveSpaceIdx(idx)}
                                      onMouseLeave={() => setHoveredMoveSpaceIdx(null)}
                                      className="w-full rounded-lg flex items-center gap-3 px-3.5 h-10 text-[13px] font-light text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-control-hover)] transition-colors duration-150 relative [app-region:no-drag]"
                                      style={disableAnimations ? { transition: 'none' } : undefined}
                                    >
                                      <span className="relative flex items-center gap-3 w-full z-10">
                                        <SvgIcon svg={folderSvg} size={16} />
                                        <span className="flex-1 text-left truncate">{space.name}</span>
                                      </span>
                                    </Button>
                                  ))}
                                  {moveSpaceOptions.length === 0 && (
                                    <div className="px-3.5 h-full flex items-center text-[13px] text-[var(--app-text-secondary)]">
                                      No spaces available
                                    </div>
                                  )}
                                </div>
                              </div>
                            </m.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    <Button
                      variant="ghost"
                      size="none"
                      onClick={handleSaveSelectedAsSpace}
                      className="h-full px-3 rounded-lg flex items-center gap-2 text-[var(--app-text-secondary)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)] transition-[background-color,color] duration-150 select-none"
                      title="Save selected tabs as a new space"
                    >
                      <SvgIcon svg={folderSvg} size={14} />
                      <span className="text-[12px]">Save as space</span>
                    </Button>
                  </>
                )}
                {previews.some((preview) => preview.isDuplicate) && (
                  <Button
                    variant="ghost"
                    size="none"
                    onClick={handleCloseDuplicates}
                    className="h-full px-3 rounded-lg flex items-center gap-2 text-[12px] text-[var(--app-accent)] hover:bg-[var(--app-accent-bg)] transition-[background-color] duration-100 select-none"
                    title="Close duplicate tabs"
                  >
                    <SvgIcon svg={tabsSvg} size={14} />
                    Close duplicates
                  </Button>
                )}
              </div>
            </div>

            {/* Grid */}
            <div
              className="grid gap-5 w-full max-w-[1200px] justify-center"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, 260px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode={disableAnimations ? 'sync' : 'popLayout'} initial={!disableAnimations}>
                {Object.entries(groupedPreviews).map(([group, items]) => (
                  <div key={group} className="contents">
                    <div className="col-span-full text-[12px] font-medium text-[var(--app-text-secondary)] mt-2">{group}</div>
                    {items.map((preview) => (
                      <TabCard
                        key={preview.id}
                        preview={preview}
                        isActive={preview.id === activeTabId}
                        canClose={!isOnlyTabOnNewTab}
                        isSelected={selectedIds.has(preview.id)}
                        disableAnimations={disableAnimations}
                        onSelect={() => {
                          if (isSelecting) {
                            setSelectedIds((prev) => {
                              const next = new Set(prev)
                              if (next.has(preview.id)) next.delete(preview.id)
                              else next.add(preview.id)
                              return next
                            })
                          } else {
                            handleSelect(preview.id)
                          }
                        }}
                        onClose={(e) => handleClose(e, preview.id)}
                        onToggleSelected={(e) => handleToggleSelected(e, preview.id)}
                      />
                    ))}
                  </div>
                ))}
              </AnimatePresence>

              {/* New tab card */}
              <div className="tab-overview-card" style={{ animationDelay: disableAnimations ? undefined : '0ms' }}>
                <Button
                  variant="ghost"
                  size="none"
                  onClick={handleNewTab}
                  className="w-full rounded-lg overflow-hidden
                    flex flex-col items-center justify-center gap-2
                    !bg-[var(--app-bg-secondary)] opacity-80 hover:opacity-70 active:scale-[0.97] !transition-all duration-200"
                >
                  <div className="aspect-[16/10] w-full flex flex-col items-center justify-center gap-2">
                    <SvgIcon svg={plusSvg} size={22} className="text-[var(--app-text-secondary)]" />
                    <span className="text-[13px] font-medium text-[var(--app-text-secondary)]">
                      {isPrivateContext ? 'New private tab' : 'New tab'}
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}

export const TabOverview = memo(TabOverviewInner)
