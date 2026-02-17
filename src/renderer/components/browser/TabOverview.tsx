import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Globe, CircleNotch, SpeakerHigh, X, Plus } from '@phosphor-icons/react'
import { useTabStore, type Tab } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { webviewRegistry } from '@/webview/webviewRegistry'

// ─── Springs ─────────────────────────────────────────────────────────────────

const springOverlay = { type: 'spring' as const, stiffness: 320, damping: 30, mass: 0.9 }
const springCard = { type: 'spring' as const, stiffness: 380, damping: 28, mass: 0.8 }

// ─── Types ───────────────────────────────────────────────────────────────────

interface TabPreview {
  id: string
  tab: Tab
  thumbnail: string | null
}

// ─── New Tab Placeholder ─────────────────────────────────────────────────────

const NEWTAB_GRADIENT =
  'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.10) 100%)'

// ─── TabCard ─────────────────────────────────────────────────────────────────

const TabCard = memo(function TabCard({
  preview,
  isActive,
  index,
  onSelect,
  onClose
}: {
  preview: TabPreview
  isActive: boolean
  index: number
  onSelect: () => void
  onClose: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const { tab, thumbnail } = preview
  const isNewTab = tab.url === 'browser://newtab'
  const title = tab.title || 'New Tab'

  // Stagger delay: each card animates in slightly after the previous
  const delay = Math.min(index * 0.035, 0.25)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.88, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 20 }}
      transition={{ ...springCard, delay }}
      className="group relative"
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
              <Globe size={28} className="text-gray-300 dark:text-neutral-600" weight="regular" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors duration-150" />
        </div>

        {/* Info bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-neutral-900">
          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
            {tab.isLoading ? (
              <CircleNotch size={13} className="animate-spin text-gray-400" weight="bold" />
            ) : tab.favicon ? (
              <img src={tab.favicon} alt="" className="w-4 h-4 rounded-sm" draggable={false} />
            ) : (
              <Globe size={13} className="text-gray-400" weight="regular" />
            )}
          </div>
          <span className="flex-1 text-[12px] font-medium text-gray-700 dark:text-neutral-300 truncate">
            {title}
          </span>
          {tab.isPlayingMedia && (
            <SpeakerHigh size={12} weight="fill" className="flex-shrink-0 text-blue-500" />
          )}
        </div>

        {/* Active indicator dot */}
        {isActive && (
          <div className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/40" />
        )}
      </button>

      {/* Close button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: delay + 0.08, ...springCard }}
        className="absolute -top-1.5 -right-1.5 z-10"
      >
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-gray-800/80 dark:bg-neutral-600/90 backdrop-blur-sm
            flex items-center justify-center text-white
            opacity-0 group-hover:opacity-100 transition-opacity duration-150
            hover:bg-red-500 dark:hover:bg-red-500 active:scale-90"
          aria-label={`Close ${title}`}
        >
          <X size={11} weight="bold" />
        </button>
      </motion.div>
    </motion.div>
  )
})

// ─── TabOverview ─────────────────────────────────────────────────────────────

function TabOverviewInner(): React.JSX.Element {
  const isOpen = useUIStore((s) => s.isTabOverviewOpen)
  const closeOverview = useUIStore((s) => s.closeTabOverview)
  const tabOrder = useTabStore((s) => s.tabOrder)
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const removeTab = useTabStore((s) => s.removeTab)
  const addTab = useTabStore((s) => s.addTab)
  const [previews, setPreviews] = useState<TabPreview[]>([])
  const capturedRef = useRef(false)

  // Capture thumbnails when opening
  useEffect(() => {
    if (!isOpen) {
      capturedRef.current = false
      return
    }
    if (capturedRef.current) return
    capturedRef.current = true

    // Build initial previews (no thumbnails yet) so UI appears instantly
    const initial: TabPreview[] = tabOrder
      .map((id) => {
        const tab = tabs[id]
        if (!tab) return null
        return { id, tab, thumbnail: null } as TabPreview
      })
      .filter(Boolean) as TabPreview[]
    setPreviews(initial)

    // Capture thumbnails in parallel
    const capture = async (): Promise<void> => {
      const results = await Promise.all(
        tabOrder.map(async (id) => {
          const tab = tabs[id]
          if (!tab) return null
          const thumbnail = tab.url === 'browser://newtab' ? null : await webviewRegistry.capturePage(id)
          return { id, tab, thumbnail } as TabPreview
        })
      )
      const valid = results.filter(Boolean) as TabPreview[]
      setPreviews(valid)
    }
    capture()
  }, [isOpen, tabOrder, tabs])

  // Update tab data in previews when tabs change while open
  useEffect(() => {
    if (!isOpen || previews.length === 0) return
    setPreviews((prev) =>
      tabOrder
        .map((id) => {
          const tab = tabs[id]
          if (!tab) return null
          const existing = prev.find((p) => p.id === id)
          return { id, tab, thumbnail: existing?.thumbnail ?? null } as TabPreview
        })
        .filter(Boolean) as TabPreview[]
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabOrder.length])

  const handleSelect = useCallback(
    (tabId: string) => {
      setActiveTab(tabId)
      closeOverview()
    },
    [setActiveTab, closeOverview]
  )

  const handleClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation()
      removeTab(tabId)
    },
    [removeTab]
  )

  const handleNewTab = useCallback(() => {
    addTab()
    closeOverview()
  }, [addTab, closeOverview])

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
          {/* Backdrop */}
          <motion.div
            key="tab-overview-backdrop"
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOverview}
          />

          {/* Content */}
          <motion.div
            key="tab-overview-content"
            className="fixed inset-0 z-[95] flex flex-col items-center overflow-y-auto py-12 px-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeOverview}
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springOverlay}
              className="mb-8 text-center"
            >
              <h2 className="text-xl font-semibold text-white/90 tracking-tight">
                {previews.length} {previews.length === 1 ? 'Tab' : 'Tabs'} Open
              </h2>
            </motion.div>

            {/* Grid */}
            <div
              className="grid gap-5 w-full max-w-[1200px]"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${previews.length <= 4 ? '280px' : '240px'}, 1fr))`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {previews.map((preview, index) => (
                <TabCard
                  key={preview.id}
                  preview={preview}
                  isActive={preview.id === activeTabId}
                  index={index}
                  onSelect={() => handleSelect(preview.id)}
                  onClose={(e) => handleClose(e, preview.id)}
                />
              ))}

              {/* New tab card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ ...springCard, delay: Math.min(previews.length * 0.035, 0.25) + 0.04 }}
              >
                <button
                  onClick={handleNewTab}
                  className="w-full rounded-2xl overflow-hidden aspect-[16/10] border-2 border-dashed border-white/20 hover:border-indigo-400/50
                    flex flex-col items-center justify-center gap-2 transition-all duration-200
                    hover:bg-white/5 active:scale-[0.97]"
                >
                  <Plus size={24} className="text-white/40" weight="bold" />
                  <span className="text-[13px] font-medium text-white/40">New Tab</span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export const TabOverview = memo(TabOverviewInner)
