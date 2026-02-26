import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import sparkleSvg from '@/assets/icons/Weather/Sparkle.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useUIStore } from '@/store/uiStore'
import { useTabStore } from '@/store/tabStore'
import { SPRING_SNAPPY } from '@/utils/springs'
import { AuroraGlow } from './AuroraGlow'
import { SummaryContent } from './SummaryContent'
import { OllamaSetupContent } from './OllamaSetupContent'
import { useAIStore } from '@/store/aiStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { PANEL_WIDTH, LOADING_DURATION } from './constants'

// ── Main component ──────────────────────────────────────────────────────────

function AISummaryButtonInner(): React.JSX.Element {
  const isOpen = useUIStore((s) => s.isAISummaryOpen)
  const toggleAISummary = useUIStore((s) => s.toggleAISummary)
  const closeAISummary = useUIStore((s) => s.closeAISummary)
  const aiStatus = useAIStore((s) => s.status)
  const checkAIStatus = useAIStore((s) => s.checkStatus)
  const isSummarizing = useAIStore((s) => s.isSummarizing)
  const startSummary = useAIStore((s) => s.startSummary)
  const cancelSummary = useAIStore((s) => s.cancelSummary)
  const resetSummary = useAIStore((s) => s.resetSummary)
  const isAIReady = aiStatus === 'ready'
  // Drive the aurora/badge "loading" appearance from live summarization state
  const isLoading = isSummarizing
  const [isHovered, setIsHovered] = useState(false)
  // Key used to force-remount summary content on regenerate
  const [summaryKey, setSummaryKey] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

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

  // Trigger AI status check on open; cancel & reset on close
  useEffect(() => {
    if (isOpen) {
      if (aiStatus === 'idle') {
        checkAIStatus()
      }
      if (isAIReady) {
        triggerSummarization()
      }
    } else {
      // Cancel any in-flight request so the model stops generating
      cancelSummary()
      resetSummary()
    }
  }, [isOpen, aiStatus, isAIReady, triggerSummarization, checkAIStatus, cancelSummary, resetSummary])

  // Safety net: cancel on unmount so nothing leaks if component is removed
  useEffect(() => {
    return () => {
      cancelSummary()
    }
  }, [cancelSummary])

  // Start summarization once AI becomes ready while panel is already open
  useEffect(() => {
    if (isOpen && isAIReady) {
      triggerSummarization()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIReady])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeAISummary()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeAISummary])

  const handleToggle = useCallback(() => toggleAISummary(), [toggleAISummary])
  const handleClose = useCallback(() => closeAISummary(), [closeAISummary])

  const handleRegenerate = useCallback(() => {
    setSummaryKey((k) => k + 1)
    resetSummary()
    triggerSummarization()
  }, [resetSummary, triggerSummarization])

  return (
    <>
      {/* Bottom-right hover trigger zone */}
      <div
        className="fixed bottom-0 right-0 w-20 h-20 z-[48] [app-region:no-drag]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Floating AI button */}
      <AnimatePresence>
        {(isHovered || isOpen) && (
          <motion.div
            className="fixed bottom-5 right-5 z-[50] [app-region:no-drag]"
            initial={{ scale: 0.5, opacity: 0, filter: 'blur(6px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 0.5, opacity: 0, filter: 'blur(6px)' }}
            transition={SPRING_SNAPPY}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="relative">
              {/* Trigger button */}
              <motion.button
                onClick={handleToggle}
                aria-label="AI Summary"
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                animate={{ scale: isOpen ? 0.92 : 1 }}
                whileTap={{ scale: 0.82 }}
                transition={SPRING_SNAPPY}
                className="h-10 w-10 rounded-full flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-100 select-none glass"
              >
                <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                  <motion.span
                    animate={{ scale: isOpen ? 0 : 1, rotate: isOpen ? 90 : 0, opacity: isOpen ? 0 : 1 }}
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <SvgIcon svg={sparkleSvg} size={18} />
                  </motion.span>
                  <motion.span
                    animate={{ scale: isOpen ? 1 : 0, rotate: isOpen ? 0 : -90, opacity: isOpen ? 1 : 0 }}
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <SvgIcon svg={closeSvg} size={18} />
                  </motion.span>
                </div>
              </motion.button>

              {/* Summary panel */}
              <AnimatePresence>
                {isOpen && (
                  <>
                    {/* Click-away backdrop */}
                    <div
                      className="fixed inset-0 z-[99]"
                      onMouseDown={handleClose}
                      aria-hidden="true"
                    />

                    <motion.div
                      ref={panelRef}
                      role="dialog"
                      aria-label="AI Summary"
                      aria-modal="true"
                      className="absolute bottom-full right-0 z-[100] mb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 rounded-full"
                      style={{ originX: 1, originY: 1, width: PANEL_WIDTH }}
                      initial={{ scaleX: 0.15, scaleY: 0.04, opacity: 0, y: 10, borderRadius: 40, filter: 'blur(6px)' }}
                      animate={{ scaleX: 1, scaleY: 1, opacity: 1, y: 0, borderRadius: 16, filter: 'blur(0px)' }}
                      exit={{ scaleX: 0.15, scaleY: 0.04, opacity: 0, y: 10, borderRadius: 40, filter: 'blur(6px)' }}
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 28,
                        mass: 0.6,
                        opacity: { duration: 0.12 },
                        filter: { duration: 0.2 },
                      }}
                    >
                      <div className="rounded-3xl glass-heavy overflow-hidden relative">
                        {/* Content — setup flow or summary */}
                        <div className="px-5 py-4">
                          {isAIReady ? (
                            <SummaryContent
                              key={summaryKey}
                              isLoading={isLoading}
                              loadingDuration={LOADING_DURATION}
                              onRegenerate={handleRegenerate}
                            />
                          ) : (
                            <OllamaSetupContent />
                          )}
                        </div>

                        {/* Footer */}
                        <div
                          className="px-5 py-3 flex items-center"
                          style={{ borderTop: '1px solid var(--border-subtle)' }}
                        >
                          <span className="text-[11px] text-gray-400 dark:text-neutral-600 font-light">
                            AI can make mistakes · Results may be inaccurate
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export const AISummaryButton = memo(AISummaryButtonInner)