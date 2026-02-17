import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon, SPINNER_SVG } from '@/components/ui/SvgIcon'
import globeSvg from '@/assets/icons/Nature/Globe.svg?raw'
import soundFillSvg from '@/assets/icons/Objects/Sound_Fill.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import { useTabStore, type Tab } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { webviewRegistry } from '@/webview/webviewRegistry'

// ─── Animation (CSS transitions for performance — no per-card springs) ───────

const FADE_DURATION = 0.2

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

// ─── New Tab Placeholder ─────────────────────────────────────────────────────

const NEWTAB_GRADIENT =
  'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.10) 100%)'

// ─── TabCard ─────────────────────────────────────────────────────────────────

const TabCard = memo(function TabCard({
  preview,
  isActive,
  onSelect,
  onClose
}: {
  preview: TabPreview
  isActive: boolean
  onSelect: () => void
  onClose: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const { thumbnail } = preview
  const isNewTab = preview.url === 'browser://newtab'
  const title = preview.title || 'New Tab'

  return (
    <div className="group relative">
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
        <div className="relative aspect-[16/10] bg-gray-100 dark:bg-neutral-800 overflow-hidden">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-top"
              draggable={false}
            />
          ) : isNewTab ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: NEWTAB_GRADIENT }}
            >
              <span className="text-[13px] font-medium text-indigo-400/80">New Tab</span>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <SvgIcon svg={globeSvg} size={28} className="text-gray-300 dark:text-neutral-600" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors duration-150" />
        </div>

        {/* Info bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-neutral-900">
          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
            {preview.isLoading ? (
              <SvgIcon svg={SPINNER_SVG} size={13} className="animate-spin text-gray-400" />
            ) : preview.favicon ? (
              <img src={preview.favicon} alt="" className="w-4 h-4 rounded-sm" draggable={false} />
            ) : (
              <SvgIcon svg={globeSvg} size={13} className="text-gray-400" />
            )}
          </div>
          <span className="flex-1 text-[12px] font-medium text-gray-700 dark:text-neutral-300 truncate">
            {title}
          </span>
          {preview.isPlayingMedia && (
            <SvgIcon svg={soundFillSvg} size={12} className="flex-shrink-0 text-blue-500" />
          )}
        </div>

        {/* Active indicator dot */}
        {isActive && (
          <div className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/40" />
        )}
      </button>

      {/* Close button */}
      <div className="absolute -top-1.5 -right-1.5 z-10">
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-gray-800/80 dark:bg-neutral-600/90
            flex items-center justify-center text-white
            opacity-0 group-hover:opacity-100 transition-opacity duration-150
            hover:bg-red-500 dark:hover:bg-red-500 active:scale-90"
          aria-label={`Close ${title}`}
        >
          <SvgIcon svg={closeSvg} size={11} />
        </button>
      </div>
    </div>
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
          thumbnail: null
        } as TabPreview
      })
      .filter(Boolean) as TabPreview[]
    setPreviews(snapshots)

    // Capture thumbnails sequentially to avoid GPU pressure spikes
    const captureSequential = async (): Promise<void> => {
      for (let i = 0; i < snapshots.length; i++) {
        if (cancelledRef.current) return
        const snap = snapshots[i]!
        if (snap.url === 'browser://newtab') continue
        const thumbnail = await webviewRegistry.capturePage(snap.id)
        if (cancelledRef.current) return
        setPreviews((prev) =>
          prev.map((p) => (p.id === snap.id ? { ...p, thumbnail } : p))
        )
      }
    }
    captureSequential()

    return () => { cancelledRef.current = true }
  }, [isOpen])

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
      setPreviews((prev) => prev.filter((p) => p.id !== tabId))
    },
    []
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — solid overlay instead of backdrop-blur to avoid GPU pressure */}
          <motion.div
            key="tab-overview-backdrop"
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_DURATION }}
            onClick={closeOverview}
          />

          {/* Content */}
          <motion.div
            key="tab-overview-content"
            className="fixed inset-0 z-[95] flex flex-col items-center overflow-y-auto py-12 px-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: FADE_DURATION }}
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
              className="grid gap-5 w-full max-w-[1200px]"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${previews.length <= 4 ? '280px' : '240px'}, 1fr))`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {previews.map((preview) => (
                <TabCard
                  key={preview.id}
                  preview={preview}
                  isActive={preview.id === activeTabId}
                  onSelect={() => handleSelect(preview.id)}
                  onClose={(e) => handleClose(e, preview.id)}
                />
              ))}

              {/* New tab card */}
              <div>
                <button
                  onClick={handleNewTab}
                  className="w-full rounded-2xl overflow-hidden aspect-[16/10] border-2 border-dashed border-white/20 hover:border-indigo-400/50
                    flex flex-col items-center justify-center gap-2 transition-all duration-200
                    hover:bg-white/5 active:scale-[0.97]"
                >
                  <SvgIcon svg={plusSvg} size={24} className="text-white/40" />
                  <span className="text-[13px] font-medium text-white/40">New Tab</span>
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
