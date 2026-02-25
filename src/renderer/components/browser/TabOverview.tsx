import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon, SPINNER_SVG } from '@/components/ui/SvgIcon'
import globeSvg from '@/assets/icons/Nature/Globe_Fill.svg?raw'
import soundFillSvg from '@/assets/icons/Objects/Sound_Fill.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import { useTabStore, type Tab } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { useSpaceStore } from '@/store/spaceStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { NewTabPage } from '@/newtab/NewTabPage'
import { SPRING } from '@/utils/springs'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TabPreview {
  id: string
  title: string
  url: string
  favicon: string
  isLoading: boolean
  isPlayingMedia: boolean
  thumbnail: string | null
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
  onSelect,
  onClose
}: {
  preview: TabPreview
  isActive: boolean
  index: number
  canClose: boolean
  onSelect: () => void
  onClose: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const { thumbnail } = preview
  const isNewTab = preview.url === 'browser://newtab'
  const title = preview.title || 'New Tab'

  return (
    <motion.div
      layout
      className="group relative tab-overview-card"
      style={{ animationDelay: `${index * 40}ms` }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <button
        onClick={onSelect}
        className={`
          relative w-full rounded-2xl overflow-hidden text-left transition-shadow duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50
          ${isActive
            ? 'ring-2 ring-indigo-500 shadow-xl'
            : 'ring-1 ring-gray-200 dark:ring-neutral-700 shadow-lg hover:shadow-xl hover:ring-indigo-400/50 dark:hover:ring-indigo-500/40'
          }
        `}
      >
        {/* Thumbnail area */}
        <div className="relative aspect-[16/10] bg-gray-100 dark:bg-neutral-800 overflow-hidden rounded-t-2xl">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-top"
              draggable={false}
            />
          ) : isNewTab ? (
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
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-neutral-850">
              <SvgIcon svg={globeSvg} size={28} className="text-gray-300 dark:text-neutral-600" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors duration-150" />
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
  const isOpen = useUIStore((s) => s.isTabOverviewOpen)
  const closeOverview = useUIStore((s) => s.closeTabOverview)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const [previews, setPreviews] = useState<TabPreview[]>([])
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
    const { spaces, activeSpaceId } = useSpaceStore.getState()
    const spaceTabSet = new Set(spaces[activeSpaceId]?.tabIds ?? [])
    const spaceTabOrder = tabOrder.filter((id) => spaceTabSet.has(id))
    const snapshots: TabPreview[] = spaceTabOrder
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
          thumbnail: tab.thumbnail
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — solid overlay */}
          <motion.div
            key="tab-overview-backdrop"
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeOverview}
          />

          {/* Content */}
          <motion.div
            key="tab-overview-content"
            className="fixed inset-0 z-[95] flex flex-col items-center overflow-y-auto py-12 px-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ ...SPRING, damping: 30, opacity: { duration: 0.15 } }}
            onClick={closeOverview}
          >
            {/* Header */}
            <div className="mb-8 text-center">
              <h2 className="text-xl font-semibold text-white/90 tracking-tight">
                {previews.length} {previews.length === 1 ? 'Tab' : 'Tabs'} Open
              </h2>
            </div>

            {/* Grid */}
            <div
              className="grid gap-5 w-full max-w-[1200px] justify-center"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, 260px)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="popLayout">
                {previews.map((preview, i) => (
                  <TabCard
                    key={preview.id}
                    preview={preview}
                    isActive={preview.id === activeTabId}
                    index={i}
                    canClose={!isOnlyTabOnNewTab}
                    onSelect={() => handleSelect(preview.id)}
                    onClose={(e) => handleClose(e, preview.id)}
                  />
                ))}
              </AnimatePresence>

              {/* New tab card */}
              <div className="tab-overview-card" style={{ animationDelay: `${previews.length * 40}ms` }}>
                <button
                  onClick={handleNewTab}
                  className="w-full rounded-2xl overflow-hidden border-2 border-dashed border-white/20 hover:border-indigo-400/50
                    flex flex-col items-center justify-center gap-2 transition-all duration-200
                    hover:bg-white/5 active:scale-[0.97]"
                >
                  <div className="aspect-[16/10] w-full flex flex-col items-center justify-center gap-2">
                    <SvgIcon svg={plusSvg} size={24} className="text-white/40" />
                    <span className="text-[13px] font-medium text-white/40">New Tab</span>
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
