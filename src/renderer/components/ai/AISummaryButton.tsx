import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import starSvg from '@/assets/icons/Interface/Star.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useUIStore } from '@/store/uiStore'
import { SPRING, SPRING_SNAPPY, SPRING_LIST } from '@/utils/springs'

// ── Shimmer lines for loading skeleton ───────────────────────────────────────

function ShimmerLine({ width, delay }: { width: string; delay: number }): React.JSX.Element {
  return (
    <motion.div
      className="h-2.5 rounded-full relative overflow-hidden"
      style={{ width, background: 'var(--glass-bg-subtle)' }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING_LIST, delay }}
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(120,120,120,0.12) 50%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', delay: delay + 0.3 }}
      />
    </motion.div>
  )
}

// ── Fake summary content (UI-only) ──────────────────────────────────────────

const FAKE_SUMMARY = [
  'This page covers the main concepts and features of the current website.',
  'Key topics include navigation structure, content hierarchy, and interactive elements.',
  'The site uses a responsive layout with multiple sections organized by category.',
]

function SummaryContent({ isLoading }: { isLoading: boolean }): React.JSX.Element {
  return (
    <div className="space-y-3 px-1">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.2 }}
          >
            <ShimmerLine width="92%" delay={0.05} />
            <ShimmerLine width="78%" delay={0.1} />
            <ShimmerLine width="85%" delay={0.15} />
            <ShimmerLine width="60%" delay={0.2} />
            <div className="h-3" />
            <ShimmerLine width="88%" delay={0.28} />
            <ShimmerLine width="72%" delay={0.33} />
            <ShimmerLine width="80%" delay={0.38} />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            {FAKE_SUMMARY.map((line, i) => (
              <motion.p
                key={i}
                className="text-[13px] leading-relaxed text-gray-600 dark:text-neutral-400 font-light"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...SPRING_LIST, delay: i * 0.06 }}
              >
                {line}
              </motion.p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Pulsing star icon for loading state ─────────────────────────────────────

function PulsingStarIcon(): React.JSX.Element {
  return (
    <motion.span
      className="inline-flex"
      animate={{
        scale: [1, 1.18, 1],
        rotate: [0, 8, -8, 0],
        filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <SvgIcon svg={starSvg} size={14} />
    </motion.span>
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

  // Simulate loading when opening
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      timerRef.current = setTimeout(() => setIsLoading(false), 2400)
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
                    <SvgIcon svg={starSvg} size={18} />
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
                      className="absolute bottom-full right-0 z-[100] w-[320px] mb-2"
                      style={{ originX: 1, originY: 1 }}
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
                      <div className="rounded-3xl glass-heavy overflow-hidden">
                        {/* Header */}
                        <div
                          className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0"
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
                          <h2 className="text-[13px] font-medium text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                            {isLoading ? <PulsingStarIcon /> : <SvgIcon svg={starSvg} size={14} />}
                            AI Summary
                          </h2>
                          <button
                            onClick={handleClose}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150"
                          >
                            <SvgIcon svg={closeSvg} size={12} />
                          </button>
                        </div>

                        {/* Content */}
                        <div className="px-4 py-4 max-h-[320px] overflow-y-auto glass-scroll">
                          <SummaryContent isLoading={isLoading} />
                        </div>

                        {/* Footer */}
                        <div
                          className="px-5 py-3 flex items-center justify-between"
                          style={{ borderTop: '1px solid var(--border-subtle)' }}
                        >
                          <span className="text-[11px] text-gray-400 dark:text-neutral-500 font-light">
                            {isLoading ? 'Analyzing page…' : 'Powered by AI'}
                          </span>
                          {isLoading && (
                            <motion.div
                              className="flex items-center gap-1"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              {[0, 1, 2].map((i) => (
                                <motion.div
                                  key={i}
                                  className="w-1 h-1 rounded-full bg-gray-400 dark:bg-neutral-500"
                                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                                  transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    delay: i * 0.15,
                                    ease: 'easeInOut',
                                  }}
                                />
                              ))}
                            </motion.div>
                          )}
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
