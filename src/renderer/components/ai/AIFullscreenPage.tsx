import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useUIStore } from '@/store/uiStore'
import { useTabStore } from '@/store/tabStore'
import { useAIStore } from '@/store/aiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { SPRING_SNAPPY } from '@/utils/springs'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { RainbowEdgeLoading } from './RainbowEdgeLoading'
import { SummaryContent } from './SummaryContent'
import { OllamaSetupContent } from './OllamaSetupContent'
import { LOADING_DURATION } from './constants'

/**
 * AIFullscreenPage
 * A full-screen AI experience with:
 * - Original website visible in background
 * - Rainbow edge animation during loading
 * - Summary overlay that animates in from top to bottom
 * - Toggle button to switch between summary and original view
 */

function AIFullscreenPageInner(): React.JSX.Element {
  const isOpen = useUIStore((s) => s.isAIFullscreenOpen)
  const isSummaryOverlayVisible = useUIStore((s) => s.isAISummaryOverlayVisible)
  const toggleSummaryOverlay = useUIStore((s) => s.toggleAISummaryOverlay)
  const closeAIFullscreen = useUIStore((s) => s.closeAIFullscreen)
  const aiStatus = useAIStore((s) => s.status)
  const checkAIStatus = useAIStore((s) => s.checkStatus)
  const isSummarizing = useAIStore((s) => s.isSummarizing)
  const startSummary = useAIStore((s) => s.startSummary)
  const cancelSummary = useAIStore((s) => s.cancelSummary)
  const resetSummary = useAIStore((s) => s.resetSummary)
  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects)
  const isAIReady = aiStatus === 'ready'
  const isLoading = isSummarizing
  const [summaryKey, setSummaryKey] = useState(0)

  const triggerSummarization = useCallback(async () => {
    const tabId = useTabStore.getState().activeTabId
    let pageText = ''
    if (tabId) {
      const webview = webviewRegistry.get(tabId)
      if (webview) {
        try {
          pageText = (await webview.executeJavaScript('document.body.innerText')) as string
        } catch {
          // page text extraction failed — proceed with empty text
        }
      }
    }
    startSummary(pageText)
  }, [startSummary])

  // Trigger AI status check and summarization on open
  useEffect(() => {
    if (isOpen) {
      if (aiStatus === 'idle') {
        checkAIStatus()
      } else if (isAIReady) {
        triggerSummarization()
      }
    } else {
      cancelSummary()
      resetSummary()
    }
  }, [isOpen, aiStatus, isAIReady, triggerSummarization, checkAIStatus, cancelSummary, resetSummary])

  // Show summary overlay automatically when loading completes
  useEffect(() => {
    if (isOpen && !isLoading && isAIReady) {
      const timer = setTimeout(() => {
        useUIStore.setState({ isAISummaryOverlayVisible: true })
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isLoading, isAIReady])

  useEffect(() => {
    return () => {
      cancelSummary()
    }
  }, [cancelSummary])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeAIFullscreen()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeAIFullscreen])

  const handleRegenerate = useCallback(() => {
    setSummaryKey((k) => k + 1)
    resetSummary()
    useUIStore.setState({ isAISummaryOverlayVisible: false })
    triggerSummarization()
  }, [resetSummary, triggerSummarization])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[150] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Loading phase: rainbow edges */}
          <AnimatePresence>
            {isLoading && <RainbowEdgeLoading />}
          </AnimatePresence>

          {/* Content area - original website remains visible in background */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Summary overlay - animates in from top to bottom */}
            <AnimatePresence>
              {isSummaryOverlayVisible && !isLoading && (
                <motion.div
                  className="absolute inset-0 z-[151]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Semi-transparent background for the overlay */}
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                  {/* Summary content container */}
                  <motion.div
                    className="relative z-10 w-full h-full overflow-auto"
                    initial={{ y: '-100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }}
                  >
                    {/* Content padding and sizing */}
                    <div className="max-w-4xl mx-auto px-6 py-8 md:py-12">
                      {isAIReady ? (
                        <SummaryContent
                          key={summaryKey}
                          isLoading={false}
                          loadingDuration={LOADING_DURATION}
                          onRegenerate={handleRegenerate}
                        />
                      ) : (
                        <OllamaSetupContent />
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top control bar */}
            <motion.div
              className="absolute top-0 left-0 right-0 z-[152] pointer-events-none"
              initial={{ opacity: 0, y: -20 }}
              animate={!isLoading ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="flex items-center justify-between px-6 py-4">
                {/* Smart toggle button in glass pill */}
                {!isLoading && isAIReady && (
                  <motion.div
                    className={`pointer-events-auto rounded-full drop-shadow-lg ${disableBlurEffects ? 'bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10' : 'bg-white/90 dark:bg-[#1D1F23]/90 backdrop-blur-xs border border-black/5 dark:border-white/5'}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.button
                      onClick={toggleSummaryOverlay}
                      className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-gray-700 dark:text-neutral-300 text-sm font-medium select-none transition-colors duration-150 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] whitespace-nowrap h-9 min-w-[96px]"
                    >
                      {isSummaryOverlayVisible ? 'Original' : 'Summary'}
                    </motion.button>
                  </motion.div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Close button in glass pill */}
                {!isLoading && (
                  <motion.div
                    className={`pointer-events-auto rounded-full drop-shadow-lg ${disableBlurEffects ? 'bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10' : 'bg-white/90 dark:bg-[#1D1F23]/90 backdrop-blur-xs border border-black/5 dark:border-white/5'}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.button
                      onClick={closeAIFullscreen}
                      className="h-10 w-10 rounded-full flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150 select-none"
                      aria-label="Close AI Summary"
                    >
                      <SvgIcon svg={closeSvg} size={18} />
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const AIFullscreenPage = memo(AIFullscreenPageInner)
