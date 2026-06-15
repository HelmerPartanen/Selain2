import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon, SPINNER_SVG } from '@/components/ui/SvgIcon'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import globeSvg from '@/assets/icons/Nature/Globe_Fill.svg?raw'
import soundFillSvg from '@/assets/icons/Objects/Sound_Fill.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import searchSvg from '@/assets/icons/Objects/Search.svg?raw'
import tabsSvg from '@/assets/icons/Interface/Tabs.svg?raw'
import folderSvg from '@/assets/icons/Objects/Folder.svg?raw'
import bedSvg from '@/assets/icons/Objects/Bed.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import chevronDownSvg from '@/assets/icons/Arrows/Chevron_Down.svg?raw'
import { useShallow } from 'zustand/react/shallow'
import { useTabStore, type Tab } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSpaceStore, type Space } from '@/store/spaceStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { NewTabPage } from '@/newtab/NewTabPage'
import { SPRING } from '@/utils/springs'
import { findDuplicateTabIds, getTabDomain } from '@/utils/tabAnalysis'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TabPreview {
  id: string
  title: string
  url: string
  favicon: string
  isLoading: boolean
  isPlayingMedia: boolean
  thumbnail: string | null
  domain: string
  spaceName: string
  isDuplicate: boolean
  pinned: boolean
  isSuspended: boolean
}

const MAX_THUMBNAIL_CAPTURES = 16
const CAPTURE_GAP_MS = 30

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

// ─── New Tab Placeholder ─────────────────────────────────────────────────────

const NEWTAB_GRADIENT =
  'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.10) 100%)'

// ─── TabCard ─────────────────────────────────────────────────────────────────

const TabCard = memo(function TabCard({
  preview,
  isActive,
  index,
  canClose,
  isSelected,
  disableAnimations,
  onSelect,
  onClose,
  onToggleSelected
}: {
  preview: TabPreview
  isActive: boolean
  index: number
  canClose: boolean
  isSelected: boolean
  disableAnimations: boolean
  onSelect: () => void
  onClose: (e: React.MouseEvent) => void
  onToggleSelected: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const { thumbnail } = preview
  const isNewTab = preview.url === 'browser://newtab'
  const title = preview.title || 'New Tab'

  return (
    <motion.div
      layout={!disableAnimations}
      className="group relative tab-overview-card"
      style={{ animationDelay: disableAnimations ? undefined : `${index * 40}ms` }}
      exit={disableAnimations ? undefined : { scale: 0.8, opacity: 0 }}
      transition={disableAnimations ? { duration: 0 } : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <button
        onClick={onSelect}
        className={`
          relative w-full rounded-lg overflow-hidden text-left transition-shadow duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
          ${isActive
            ? 'ring-2 ring-blue-500 shadow-xl'
            : isSelected
              ? 'ring-2 ring-emerald-500 shadow-xl'
              : 'ring-1 ring-gray-200 dark:ring-neutral-700 shadow-lg hover:shadow-xl hover:ring-blue-400/50 dark:hover:ring-blue-500/40'
          }
        `}
      >
        {/* Thumbnail area */}
        <div className="relative aspect-[16/10] bg-gray-100 dark:bg-neutral-800 overflow-hidden">
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
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-neutral-850">
                  <div className="text-center">
                    <div className="text-[11px] text-gray-500 dark:text-neutral-400">
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
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-neutral-850">
              <SvgIcon svg={globeSvg} size={28} className="text-gray-300 dark:text-neutral-600" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors duration-150" />
          <button
            onClick={onToggleSelected}
            className={`absolute top-2 left-2 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
              isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-black/30 border-white/30'
            }`}
            aria-label={isSelected ? 'Deselect tab' : 'Select tab'}
          >
            {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
          </button>
          <div className="absolute top-2 right-2 flex gap-1">
            {preview.pinned && <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[9px]">Pinned</span>}
            {preview.isDuplicate && <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px]">Duplicate</span>}
            {preview.isSuspended && <span className="px-1.5 py-0.5 rounded-full bg-neutral-700 text-white text-[9px]">Sleeping</span>}
          </div>
        </div>
      </button>

      {/* Close button — only shown when the tab can be closed */}
      {canClose && (
        <div className="absolute -top-1.5 -right-1.5 z-10">
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-gray-800/80 dark:bg-neutral-600/90
              flex items-center justify-center text-white
              opacity-0 group-hover:opacity-100 transition-opacity duration-150
              hover:bg-gray-600/80 dark:hover:bg-neutral-700/90 active:scale-90"
            aria-label={`Close ${title}`}
          >
            <SvgIcon svg={closeSvg} size={11} />
          </button>
        </div>
      )}

      {/* Title below card */}
      <div className="flex items-center gap-1.5 mt-2 px-1">
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {preview.isLoading ? (
            <SvgIcon svg={SPINNER_SVG} size={12} className="animate-spin text-white/40" />
          ) : preview.favicon ? (
            <img src={preview.favicon} alt="" className="w-3.5 h-3.5 rounded-sm" draggable={false} />
          ) : (
            <SvgIcon svg={globeSvg} size={12} className="text-white/40" />
          )}
        </div>
        <span className="flex-1 text-[11px] text-white/60 truncate">{title}</span>
        {preview.isPlayingMedia && (
          <SvgIcon svg={soundFillSvg} size={11} className="flex-shrink-0 text-blue-400" />
        )}
      </div>
    </motion.div>
  )
})

// ─── TabOverview ─────────────────────────────────────────────────────────────

function TabOverviewInner(): React.JSX.Element {
  const { isOpen, closeOverview } = useUIStore(useShallow((s) => ({
    isOpen: s.isTabOverviewOpen,
    closeOverview: s.closeTabOverview,
  })))
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)
  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const [previews, setPreviews] = useState<TabPreview[]>([])
  const [query, setQuery] = useState('')
  const [groupMode, setGroupMode] = useState<'space' | 'domain'>('space')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false)
  const [hoveredMoveSpaceIdx, setHoveredMoveSpaceIdx] = useState<number | null>(null)
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
    const { spaces } = useSpaceStore.getState()
    const spaceByTabId = new Map<string, string>()
    for (const space of Object.values(spaces)) {
      for (const tabId of space.tabIds) {
        spaceByTabId.set(tabId, space.name)
      }
    }
    const duplicates = findDuplicateTabIds(tabOrder, tabs)
    const snapshots: TabPreview[] = tabOrder
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
          domain: getTabDomain(tab.url),
          spaceName: spaceByTabId.get(id) ?? 'General',
          isDuplicate: duplicates.has(id),
          pinned: tab.pinned,
          isSuspended: tab.isSuspended
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
      if (!activeSnapshot || activeSnapshot.url === 'browser://newtab') return

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
  }, [isOpen, activeTabId])

  const handleSelect = useCallback(
    (tabId: string) => {
      useTabStore.getState().setActiveTab(tabId)
      closeOverview()
    },
    [closeOverview]
  )

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
    useTabStore.getState().addTab()
    closeOverview()
  }, [closeOverview])

  const filteredPreviews = previews.filter((preview) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      preview.title.toLowerCase().includes(q) ||
      preview.url.toLowerCase().includes(q) ||
      preview.domain.toLowerCase().includes(q) ||
      preview.spaceName.toLowerCase().includes(q)
    )
  })

  const groupedPreviews = filteredPreviews.reduce<Record<string, TabPreview[]>>((acc, preview) => {
    const key = groupMode === 'space' ? preview.spaceName : preview.domain
    acc[key] = [...(acc[key] ?? []), preview]
    return acc
  }, {})
  const moveSpaceOptions = useSpaceStore
    .getState()
    .spaceOrder
    .map((id) => useSpaceStore.getState().spaces[id])
    .filter((space): space is Space => Boolean(space))

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
  }, [selectedIds])

  const handleSleepSelected = useCallback(() => {
    for (const id of selectedIds) useTabStore.getState().suspendTab(id, 'cleanup')
    setPreviews((prev) => prev.map((preview) => selectedIds.has(preview.id) ? { ...preview, isSuspended: true } : preview))
    setSelectedIds(new Set())
    setIsMoveMenuOpen(false)
  }, [selectedIds])

  const handleCloseDuplicates = useCallback(() => {
    const duplicates = previews.filter((preview) => preview.isDuplicate)
    for (const preview of duplicates) useTabStore.getState().removeTab(preview.id)
    setPreviews((prev) => prev.filter((preview) => !preview.isDuplicate))
    setSelectedIds(new Set())
  }, [previews])

  const handleMoveSelectedToSpace = useCallback((spaceId: string) => {
    for (const id of selectedIds) useSpaceStore.getState().moveTabToSpace(id, spaceId)
    setIsMoveMenuOpen(false)
    setHoveredMoveSpaceIdx(null)
    setSelectedIds(new Set())
  }, [selectedIds])

  useEffect(() => {
    if (selectedIds.size === 0) {
      setIsMoveMenuOpen(false)
      setHoveredMoveSpaceIdx(null)
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
          <motion.div
            key="tab-overview-backdrop"
            className={`fixed inset-0 z-[90] bg-black/70 ${disableBlurEffects ? '' : 'backdrop-blur-sm'}`}
            initial={disableAnimations ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={disableAnimations ? undefined : { opacity: 0 }}
            transition={disableAnimations ? { duration: 0 } : { duration: 0.15 }}
            onClick={closeOverview}
          />

          {/* Content */}
          <motion.div
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
              <h2 className="text-xl font-semibold text-white/90 tracking-tight">
                {previews.length} {previews.length === 1 ? 'Tab' : 'Tabs'} Open
              </h2>
              <div
                className={`mt-4 flex flex-wrap items-center justify-center gap-1.5 max-w-[calc(100vw-40px)] rounded-full px-1.5 py-1 drop-shadow-lg ${disableBlurEffects ? 'bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10' : 'bg-white/90 dark:bg-[#1D1F23]/90 backdrop-blur-xs border border-black/5 dark:border-white/5'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative flex items-center h-10 w-72 max-w-[calc(100vw-72px)] min-w-0">
                  <SvgIcon svg={searchSvg} size={14} className="absolute left-3 text-gray-500 dark:text-neutral-400 pointer-events-none" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search tabs"
                    className="w-full h-full rounded-full bg-transparent pl-9 pr-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => setGroupMode(groupMode === 'space' ? 'domain' : 'space')}
                  className="h-10 px-3 rounded-full flex items-center gap-2 text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] hover:text-gray-900 dark:hover:bg-white/[0.06] dark:hover:text-white transition-[background-color,color] duration-150 select-none"
                  title={`Group by ${groupMode === 'space' ? 'domain' : 'space'}`}
                  aria-label={`Group by ${groupMode === 'space' ? 'domain' : 'space'}`}
                >
                  <SvgIcon svg={groupMode === 'space' ? folderSvg : globeSvg} size={14} />
                  <span className="text-[12px]">{groupMode === 'space' ? 'Space' : 'Domain'}</span>
                </button>
                {selectedIds.size > 0 && (
                  <>
                    <button
                      onClick={handleSleepSelected}
                      className="h-10 px-3 rounded-full flex items-center gap-2 text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] hover:text-gray-900 dark:hover:bg-white/[0.06] dark:hover:text-white transition-[background-color,color] duration-150 select-none"
                      title={`Sleep ${selectedIds.size} selected`}
                    >
                      <SvgIcon svg={bedSvg} size={14} />
                      <span className="text-[12px]">Sleep {selectedIds.size}</span>
                    </button>
                    <button
                      onClick={handleCloseSelected}
                      className="h-10 px-3 rounded-full flex items-center gap-2 text-red-500 hover:bg-red-500/[0.08] transition-[background-color] duration-150 select-none"
                      title={`Close ${selectedIds.size} selected`}
                    >
                      <SvgIcon svg={trashSvg} size={14} />
                      <span className="text-[12px]">Close {selectedIds.size}</span>
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setIsMoveMenuOpen((open) => !open)}
                        className="h-10 px-3 rounded-full flex items-center gap-2 text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] hover:text-gray-900 dark:hover:bg-white/[0.06] dark:hover:text-white transition-[background-color,color] duration-150 select-none"
                        title="Move selected tabs to space"
                        aria-label="Move selected tabs to space"
                        aria-expanded={isMoveMenuOpen}
                      >
                        <SvgIcon svg={folderSvg} size={14} />
                        <span className="text-[12px]">Move</span>
                        <span className="flex h-4 w-4 items-center justify-center">
                          <SvgIcon svg={chevronDownSvg} size={11} />
                        </span>
                      </button>
                      <AnimatePresence>
                        {isMoveMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-[99]" onMouseDown={() => setIsMoveMenuOpen(false)} />
                            <motion.div
                              className="absolute top-full left-1/2 z-[110] mt-2 min-w-[220px]"
                              style={{ originX: 0.5, originY: 0, x: '-50%' }}
                              initial={disableAnimations ? undefined : {
                                scaleX: 0.15,
                                scaleY: 0.04,
                                opacity: 0,
                                y: -8,
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
                                y: -8,
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
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <div className={`rounded-xl drop-shadow-lg overflow-hidden ${disableBlurEffects ? 'bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10' : 'bg-white dark:bg-[#1D1F23] border border-black/5 dark:border-white/5'}`}>
                                <div className="p-1 relative">
                                  {moveSpaceOptions.map((space, idx) => (
                                    <button
                                      key={space.id}
                                      onClick={() => handleMoveSelectedToSpace(space.id)}
                                      onMouseEnter={() => setHoveredMoveSpaceIdx(idx)}
                                      onMouseLeave={() => setHoveredMoveSpaceIdx(null)}
                                      className="w-full rounded-xl flex items-center gap-3 px-3.5 h-10 text-[13px] font-light text-gray-700 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-150 relative [app-region:no-drag]"
                                      style={disableAnimations
                                        ? { opacity: 1, animation: 'none' }
                                        : {
                                            opacity: 0,
                                            animation: `menu-item-in 160ms ease-out ${50 + idx * 20}ms forwards`,
                                          }}
                                    >
                                      <span className="relative flex items-center gap-3 w-full z-10">
                                        <SvgIcon svg={folderSvg} size={16} />
                                        <span className="flex-1 text-left truncate">{space.name}</span>
                                      </span>
                                    </button>
                                  ))}
                                  {moveSpaceOptions.length === 0 && (
                                    <div className="px-3.5 h-10 flex items-center text-[13px] text-gray-500 dark:text-neutral-400">
                                      No spaces available
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
                {previews.some((preview) => preview.isDuplicate) && (
                  <button
                    onClick={handleCloseDuplicates}
                    className="h-10 px-3 rounded-full flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:bg-amber-500/[0.1] transition-[background-color] duration-150 select-none"
                    title="Close duplicate tabs"
                  >
                    <SvgIcon svg={tabsSvg} size={14} />
                    Close duplicates
                  </button>
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
                    <div className="col-span-full text-[12px] uppercase tracking-wider text-white/45 mt-2">{group}</div>
                    {items.map((preview, i) => (
                      <TabCard
                        key={preview.id}
                        preview={preview}
                        isActive={preview.id === activeTabId}
                        index={i}
                        canClose={!isOnlyTabOnNewTab}
                        isSelected={selectedIds.has(preview.id)}
                        disableAnimations={disableAnimations}
                        onSelect={() => handleSelect(preview.id)}
                        onClose={(e) => handleClose(e, preview.id)}
                        onToggleSelected={(e) => handleToggleSelected(e, preview.id)}
                      />
                    ))}
                  </div>
                ))}
              </AnimatePresence>

              {/* New tab card */}
              <div className="tab-overview-card" style={{ animationDelay: disableAnimations ? undefined : `${previews.length * 40}ms` }}>
                <button
                  onClick={handleNewTab}
                  className="w-full rounded-lg overflow-hidden border border-black/10 dark:border-white/10
                    flex flex-col items-center justify-center gap-2 transition-all duration-200
                    bg-white/80 dark:bg-[#1D1F23]/80 hover:bg-white dark:hover:dark:bg-[#1D1F23]/60 active:scale-[0.97]"
                >
                  <div className="aspect-[16/10] w-full flex flex-col items-center justify-center gap-2">
                    <SvgIcon svg={plusSvg} size={22} className="text-gray-500 dark:text-neutral-400" />
                    <span className="text-[13px] font-medium text-gray-600 dark:text-neutral-400">New Tab</span>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export const TabOverview = memo(TabOverviewInner)
