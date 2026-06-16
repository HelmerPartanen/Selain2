import { memo, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import { SvgIcon } from '@/components/ui/SvgIcon'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useUIStore } from '@/store/uiStore'
import { useTabStore } from '@/store/tabStore'
import { useAIStore } from '@/store/aiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { extractPageContentForSummary, isLikelyPdfUrl } from '@/utils/extractPageContent'
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

// ── Inline micro-icons ────────────────────────────────────────────────────────

const CopyIcon = (): React.JSX.Element => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const CheckIcon = (): React.JSX.Element => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const RefreshIcon = (): React.JSX.Element => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

function AIFullscreenPageInner(): React.JSX.Element {
  const { isOpen, isSummaryOverlayVisible, closeAIFullscreen } = useUIStore(useShallow((s) => ({
    isOpen: s.isAIFullscreenOpen,
    isSummaryOverlayVisible: s.isAISummaryOverlayVisible,
    closeAIFullscreen: s.closeAIFullscreen,
  })))
  const aiStatus = useAIStore((s) => s.status)
  const checkAIStatus = useAIStore((s) => s.checkStatus)
  const isSummarizing = useAIStore((s) => s.isSummarizing)
  const summarySource = useAIStore((s) => s.summarySource)
  const summary = useAIStore((s) => s.summary)
  const startSummary = useAIStore((s) => s.startSummary)
  const cancelSummary = useAIStore((s) => s.cancelSummary)
  const resetSummary = useAIStore((s) => s.resetSummary)
  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects)
  const isAIReady = aiStatus === 'ready'
  const isLoading = isSummarizing
  const isPdfThinking = summarySource === 'pdf' && isOpen && !isSummaryOverlayVisible
  const isThinking = isLoading || isPdfThinking
  const [summaryKey, setSummaryKey] = useState(0)
  const [copied, setCopied] = useState(false)

  const wordCount = summary ? summary.trim().split(/\s+/).length : 0

  const handleCopy = useCallback(() => {
    if (!summary) return
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      // Clipboard access denied — no feedback change needed
    })
  }, [summary])

  const triggerSummarization = useCallback(async () => {
    const tabId = useTabStore.getState().activeTabId
    if (!tabId) {
      startSummary('')
      return
    }

    const url = useTabStore.getState().tabs[tabId]?.url ?? ''
    if (isLikelyPdfUrl(url)) {
      useAIStore.setState({ summarySource: 'pdf' })
    }

    const { text, source } = await extractPageContentForSummary(tabId)
    startSummary(text, source)
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
    if (isOpen && !isLoading && aiStatus !== 'idle' && aiStatus !== 'checking') {
      const timer = setTimeout(() => {
        useUIStore.setState({ isAISummaryOverlayVisible: true })
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen, isLoading, aiStatus])

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
          className={`fixed inset-0 z-[150] ${isSummaryOverlayVisible ? 'overflow-hidden' : 'overflow-auto pointer-events-none'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Loading phase: rainbow edges (websites and PDFs) */}
          <AnimatePresence>
            {isThinking && <RainbowEdgeLoading />}
          </AnimatePresence>

{/* PDF-only label during thinking */}
{isPdfThinking && (
  <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[152] pointer-events-none">
    <div className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-neutral-400 via-white to-neutral-400 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
      Summarizing PDF…
    </div>
  </div>
)}

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
                  <div className={`absolute inset-0 ${disableBlurEffects ? 'bg-white dark:bg-[#121316]' : 'bg-white/90 dark:bg-[#1D1F23]/80 backdrop-blur-lg'}`} />

                  {/* Summary content container */}
                  <motion.div
                    className="relative z-10 w-full h-full overflow-auto flex flex-col"
                    initial={{ y: '-100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }}
                  >
                    {/* Content padding and sizing - extend to full height with top/bottom padding for fixed bars */}
                    <div className="flex-1 max-w-4xl mx-auto w-full px-6 pt-20 pb-24">
                      {isAIReady ? (
                        <SummaryContent
                          key={summaryKey}
                          isLoading={false}
                          loadingDuration={LOADING_DURATION}
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
                    className={`pointer-events-auto rounded-full shadow-sm ${disableBlurEffects ? 'bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10' : 'bg-white/90 dark:bg-[#1D1F23]/80 backdrop-blur-xs border border-black/5 dark:border-white/5'}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                  </motion.div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Close button in glass pill */}
                {!isLoading && (
                  <motion.div
                    className="pointer-events-auto rounded-full"
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

            {/* Bottom action row — fixed at bottom */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-[152] pointer-events-none"
              initial={{ opacity: 0, y: 20 }}
              animate={!isLoading && isSummaryOverlayVisible && !isSummarizing && summary ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-[11px] text-gray-400 dark:text-neutral-600 tabular-nums">
                  {wordCount} words
                </span>
                <div className="flex-1" />
                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-100"
                    aria-label="Regenerate"
                  >
                    <RefreshIcon />
                    Regenerate
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-100"
                    aria-label="Copy summary"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {copied ? (
                        <motion.span key="check" className="flex items-center gap-1.5 text-emerald-500"
                          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.15 }}>
                          <CheckIcon />Copied
                        </motion.span>
                      ) : (
                        <motion.span key="copy" className="flex items-center gap-1.5"
                          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.15 }}>
                          <CopyIcon />Copy
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </div>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const AIFullscreenPage = memo(AIFullscreenPageInner)



