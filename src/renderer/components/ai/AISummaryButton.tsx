import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import sparkleSvg from '@/assets/icons/Weather/Sparkle.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useUIStore } from '@/store/uiStore'
import { SPRING_SNAPPY } from '@/utils/springs'

// ── Fixed dimensions ────────────────────────────────────────────────────────
const PANEL_WIDTH = 400
const CONTENT_HEIGHT = 340

// ── Apple Intelligence–style aurora glow ─────────────────────────────────────
// Animated conic gradient border that flows around the panel edge — the
// signature rainbow aurora that Apple uses across their AI features.

function AuroraGlow(): React.JSX.Element {
  return (
    <motion.div
      className="absolute -inset-[1.5px] rounded-[25px] pointer-events-none"
      style={{
        background: 'conic-gradient(from var(--aurora-angle, 0deg) at 50% 50%, #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6, #6366f1)',
        opacity: 0.55,
      }}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 0.55, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    />
  )
}

// ── Loading content ─────────────────────────────────────────────────────────

function LoadingContent(): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5"
      style={{ height: CONTENT_HEIGHT }}
    >
      {/* Aurora orb */}
      <div className="relative">
        {/* Outer glow ring */}
        <motion.div
          className="absolute -inset-3 rounded-full"
          style={{
            background: 'conic-gradient(from var(--aurora-angle, 0deg), #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6, #6366f1)',
          }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Inner orb */}
        <motion.div
          className="relative w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
          style={{
            background: 'conic-gradient(from var(--aurora-angle, 0deg), #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981, #3b82f6, #6366f1)',
          }}
        >
          {/* White/dark center cutout */}
          <div
            className="absolute inset-[2px] rounded-full flex items-center justify-center"
            style={{ background: 'var(--glass-bg-heavy)' }}
          >
            <motion.div
              className="flex items-center justify-center text-gray-500 dark:text-neutral-400"
              style={{ width: 20, height: 20 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            >
              <SvgIcon svg={sparkleSvg} size={20} />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Status text */}
      <div className="flex flex-col items-center gap-2">
        <motion.span
          className="text-[13px] font-medium text-gray-700 dark:text-neutral-300 tracking-tight"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          Summarizing
        </motion.span>
        <motion.span
          className="text-[11px] text-gray-400 dark:text-neutral-500 font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 1] }}
          transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
        >
          Reading page content…
        </motion.span>
      </div>

      {/* Minimal progress indicator — three softly pulsing dots */}
      <motion.div
        className="flex items-center gap-[6px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-[5px] h-[5px] rounded-full"
            style={{
              background: ['#8b5cf6', '#ec4899', '#3b82f6'][i],
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.35, 1, 0.35],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>
    </div>
  )
}

// ── Streaming text line (words appearing one by one) ────────────────────────

function StreamingTextLine({
  text,
  delayBase,
}: {
  text: string
  delayBase: number
}): React.JSX.Element {
  const words = text.split(' ')
  return (
    <p className="text-[13px] leading-relaxed text-gray-600 dark:text-neutral-400 font-light">
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.3em]"
          initial={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            duration: 0.25,
            delay: delayBase + i * 0.045,
            ease: 'easeOut',
          }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  )
}

// ── Fake summary content (UI-only) ──────────────────────────────────────────

const FAKE_SUMMARY = [
  'This page presents a comprehensive overview of the website\'s core architecture, covering both structural layout and interactive functionality.',
  'The navigation system uses a hierarchical structure with primary categories, subcategories, and contextual filtering. Key interactive elements include dropdown menus, search overlays, and tab-based content organization.',
  'Content is organized across multiple sections with responsive breakpoints, adapting from a multi-column grid on desktop to a single-column stack on mobile devices.',
  'Notable features include lazy-loaded media assets, client-side form validation, real-time search suggestions, and animated page transitions between sections.',
  'The overall design language follows a minimal, glass-morphic aesthetic with layered depth cues, subtle shadows, and consistent spacing tokens throughout.',
]

function SummaryContent({ isLoading }: { isLoading: boolean }): React.JSX.Element {
  return (
    <div className="relative" style={{ height: CONTENT_HEIGHT }}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)' }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <LoadingContent />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            className="absolute inset-0 overflow-y-auto glass-scroll"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
          >
            <div className="space-y-4 pr-1">
              {FAKE_SUMMARY.map((line, i) => (
                <StreamingTextLine key={i} text={line} delayBase={i * 0.35} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

function AISummaryButtonInner(): React.JSX.Element {
  const isOpen = useUIStore((s) => s.isAISummaryOpen)
  const toggleAISummary = useUIStore((s) => s.toggleAISummary)
  const closeAISummary = useUIStore((s) => s.closeAISummary)
  const [isLoading, setIsLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Simulate loading
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      timerRef.current = setTimeout(() => setIsLoading(false), 3000)
    } else {
      setIsLoading(false)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isOpen])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeAISummary()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeAISummary])

  const handleToggle = useCallback(() => {
    toggleAISummary()
  }, [toggleAISummary])

  const handleClose = useCallback(() => {
    closeAISummary()
  }, [closeAISummary])

  return (
    <>
      {/* Bottom-right hover zone — reveals button on hover */}
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
              <motion.button
                onClick={handleToggle}
                aria-label="AI Summary"
                aria-expanded={isOpen}
                animate={{ scale: isOpen ? 0.92 : 1 }}
                whileTap={{ scale: 0.82 }}
                transition={SPRING_SNAPPY}
                className="h-10 w-10 rounded-full flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-100 select-none glass"
              >
                <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                  <motion.span
                    animate={{
                      scale: isOpen ? 0 : 1,
                      rotate: isOpen ? 90 : 0,
                      opacity: isOpen ? 0 : 1,
                    }}
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <SvgIcon svg={sparkleSvg} size={18} />
                  </motion.span>
                  <motion.span
                    animate={{
                      scale: isOpen ? 1 : 0,
                      rotate: isOpen ? 0 : -90,
                      opacity: isOpen ? 1 : 0,
                    }}
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <SvgIcon svg={closeSvg} size={18} />
                  </motion.span>
                </div>
              </motion.button>

              {/* AI Summary panel — floats above the button */}
              <AnimatePresence>
                {isOpen && (
                  <>
                    {/* Click-away */}
                    <div className="fixed inset-0 z-[99]" onMouseDown={handleClose} />
                    <motion.div
                      className="absolute bottom-full right-0 z-[100] mb-2"
                      style={{ originX: 1, originY: 1, width: PANEL_WIDTH }}
                      initial={{
                        scaleX: 0.15,
                        scaleY: 0.04,
                        opacity: 0,
                        y: 10,
                        borderRadius: 40,
                        filter: 'blur(6px)',
                      }}
                      animate={{
                        scaleX: 1,
                        scaleY: 1,
                        opacity: 1,
                        y: 0,
                        borderRadius: 16,
                        filter: 'blur(0px)',
                      }}
                      exit={{
                        scaleX: 0.15,
                        scaleY: 0.04,
                        opacity: 0,
                        y: 10,
                        borderRadius: 40,
                        filter: 'blur(6px)',
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 28,
                        mass: 0.6,
                        opacity: { duration: 0.12 },
                        filter: { duration: 0.2 },
                      }}
                    >
                      {/* Aurora border glow — only visible during loading */}
                      <AnimatePresence>
                        {isLoading && <AuroraGlow />}
                      </AnimatePresence>

                      <div className="rounded-3xl glass-heavy overflow-hidden relative">
                        {/* Header */}
                        <div
                          className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0"
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
                          <h2 className="text-[13px] font-medium text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                            <SvgIcon svg={sparkleSvg} size={14} />
                            AI Summary
                          </h2>
                          <button
                            onClick={handleClose}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150"
                          >
                            <SvgIcon svg={closeSvg} size={12} />
                          </button>
                        </div>

                        {/* Content — fixed height, no layout shift */}
                        <div className="px-5 py-4">
                          <SummaryContent isLoading={isLoading} />
                        </div>

                        {/* Footer */}
                        <div
                          className="px-5 py-3 flex items-center justify-between"
                          style={{ borderTop: '1px solid var(--border-subtle)' }}
                        >
                          <AnimatePresence mode="wait">
                            <motion.span
                              className="text-[11px] text-gray-400 dark:text-neutral-500 font-light"
                              key={isLoading ? 'loading' : 'done'}
                              initial={{ opacity: 0, y: 2 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -2 }}
                              transition={{ duration: 0.2 }}
                            >
                              {isLoading ? 'Analyzing…' : 'Powered by AI'}
                            </motion.span>
                          </AnimatePresence>
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
