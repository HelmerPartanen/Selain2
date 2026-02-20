import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useAnimationFrame } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import sparkleSvg from '@/assets/icons/Weather/Sparkle.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useUIStore } from '@/store/uiStore'
import { SPRING_SNAPPY } from '@/utils/springs'

// ── Fixed dimensions ────────────────────────────────────────────────────────
const PANEL_WIDTH = 420
const CONTENT_HEIGHT = 320

// ── Rotating aurora angle hook ───────────────────────────────────────────────
// Drives the conic-gradient angle via a CSS custom property so the aurora
// border actually rotates instead of sitting static.

function useRotatingAngle(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  rpm = 0.22,
): void {
  const angleRef = useRef(0)
  useAnimationFrame((_, delta) => {
    if (!active || !ref.current) return
    angleRef.current = (angleRef.current + (rpm * 360 * delta) / 60_000) % 360
    ref.current.style.setProperty('--aurora-angle', `${angleRef.current}deg`)
  })
}

// ── Aurora palette ───────────────────────────────────────────────────────────
const AURORA_GRADIENT =
  'conic-gradient(from var(--aurora-angle, 0deg) at 50% 50%, #6366f1, #8b5cf6, #a855f7, #ec4899, #f59e0b, #10b981, #3b82f6, #6366f1)'

// ── Aurora glow border ───────────────────────────────────────────────────────
function AuroraGlow({ active }: { active: boolean }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  useRotatingAngle(ref, active)

  return (
    <motion.div
      ref={ref}
      className="absolute -inset-[1.5px] rounded-[25px] pointer-events-none"
      style={{ background: AURORA_GRADIENT }}
      initial={{ opacity: 0 }}
      animate={{ opacity: active ? 0.7 : 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    />
  )
}

// ── Apple Intelligence–style loading ────────────────────────────────────────
// One idea, executed with restraint: a slowly rotating aurora pool of light
// sits behind the sparkle icon, blurred into pure ambient color. The icon
// breathes on top of it. That is the entire animation. Nothing else.

function LoadingContent({ duration }: { duration: number }): React.JSX.Element {
  const STEPS = ['Reading page content…', 'Extracting key ideas…', 'Composing summary…']
  const [step, setStep] = useState(0)
  const auroraRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(
      () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
      duration / (STEPS.length + 0.5),
    )
    return () => clearInterval(interval)
  }, [duration])

  // ~7 seconds per revolution — Apple's pace, not a disco light
  useRotatingAngle(auroraRef, true, 0.085)

  return (
    <div className="flex flex-col items-center justify-center gap-5" style={{ height: CONTENT_HEIGHT }}>

      {/* Icon sitting in a pool of aurora light */}
      <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>

        {/* The aurora. Blurred so heavily it becomes ambient light, not a shape.
            At this blur radius, the conic-gradient reads as a slow color shift. */}
        <div
          ref={auroraRef}
          className="absolute pointer-events-none"
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'conic-gradient(from var(--aurora-angle, 0deg), #f43f5e, #a855f7, #6366f1, #38bdf8, #34d399, #f43f5e)',
            filter: 'blur(22px)',
            opacity: 0.62,
          }}
        />

        {/* Sparkle icon — slow, calm breath. Sharp above the light field. */}
        <motion.div
          className="relative z-10 flex items-center justify-center"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
          style={{
            color: 'white',
            filter: 'drop-shadow(0 0 7px rgba(255,255,255,0.4))',
          }}
        >
          <SvgIcon svg={sparkleSvg} size={26} />
        </motion.div>
      </div>

      {/* Step label — fades between steps */}
      <AnimatePresence mode="wait">
        <motion.span
          key={step}
          className="text-[12px] text-gray-400 dark:text-neutral-500"
          style={{ fontWeight: 300 }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {STEPS[step]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}


// ── Streaming text line ─────────────────────────────────────────────────────
// Staggered word reveal with a natural ease — faster at the start, settles in.
function StreamingTextLine({ text, delayBase }: { text: string; delayBase: number }): React.JSX.Element {
  const words = text.split(' ')
  return (
    <p
      className="text-[13px] leading-[1.7] text-gray-600 dark:text-neutral-400 font-light"
      aria-label={text}
    >
      {words.map((word, i) => {
        // Eased stagger: early words arrive quickly, later ones slow down
        const t = i / words.length
        const stagger = 0.028 + t * 0.04
        return (
          <motion.span
            key={i}
            className="inline-block mr-[0.3em]"
            initial={{ opacity: 0, y: 5, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.22, delay: delayBase + i * stagger, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.span>
        )
      })}
    </p>
  )
}

// ── Summary data ─────────────────────────────────────────────────────────────
const FAKE_SUMMARY = [
  "This page presents a comprehensive overview of the website's core architecture, covering both structural layout and interactive functionality.",
  'The navigation system uses a hierarchical structure with primary categories, subcategories, and contextual filtering. Key interactive elements include dropdown menus, search overlays, and tab-based content organization.',
  'Content is organized across multiple sections with responsive breakpoints, adapting from a multi-column grid on desktop to a single-column stack on mobile devices.',
  'Notable features include lazy-loaded media assets, client-side form validation, real-time search suggestions, and animated page transitions between sections.',
  'The overall design language follows a minimal, glass-morphic aesthetic with layered depth cues, subtle shadows, and consistent spacing tokens throughout.',
]

const WORD_COUNT = FAKE_SUMMARY.join(' ').split(' ').length

// ── Copy icon (inline to avoid additional imports) ───────────────────────────
const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const RefreshIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

// ── Summary content ──────────────────────────────────────────────────────────
function SummaryContent({
  isLoading,
  loadingDuration,
  onRegenerate,
}: {
  isLoading: boolean
  loadingDuration: number
  onRegenerate: () => void
}): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(FAKE_SUMMARY.join('\n\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  return (
    <div className="relative" style={{ height: CONTENT_HEIGHT }}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97, filter: 'blur(6px)' }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <LoadingContent duration={loadingDuration} />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
          >
            {/* Scrollable text area */}
            <div
              className="flex-1 overflow-y-auto glass-scroll space-y-[14px] pr-1 pb-2"
              role="region"
              aria-label="AI Summary"
              aria-live="polite"
            >
              {FAKE_SUMMARY.map((line, i) => (
                <StreamingTextLine key={i} text={line} delayBase={i * 0.32} />
              ))}
            </div>

            {/* Inline action row */}
            <motion.div
              className="flex items-center gap-2 pt-3 mt-1 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <span className="text-[11px] text-gray-400 dark:text-neutral-600 tabular-nums">
                {WORD_COUNT} words
              </span>
              <div className="flex-1" />
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-100"
                aria-label="Regenerate summary"
              >
                <RefreshIcon />
                Regenerate
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-100"
                aria-label="Copy summary to clipboard"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="check"
                      className="flex items-center gap-1.5 text-emerald-500"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <CheckIcon />
                      Copied
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      className="flex items-center gap-1.5"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <CopyIcon />
                      Copy
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
const LOADING_DURATION = 3000

function AISummaryButtonInner(): React.JSX.Element {
  const isOpen = useUIStore((s) => s.isAISummaryOpen)
  const toggleAISummary = useUIStore((s) => s.toggleAISummary)
  const closeAISummary = useUIStore((s) => s.closeAISummary)
  const [isLoading, setIsLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  // Key used to force-remount summary content on regenerate
  const [summaryKey, setSummaryKey] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const startLoading = useCallback(() => {
    setIsLoading(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setIsLoading(false), LOADING_DURATION)
  }, [])

  // Start loading when panel opens
  useEffect(() => {
    if (isOpen) {
      startLoading()
    } else {
      setIsLoading(false)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isOpen, startLoading])

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
    startLoading()
  }, [startLoading])

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
                      className="absolute bottom-full right-0 z-[100] mb-2 focus:outline-none"
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
                      {/* Rotating aurora border — only during loading */}
                      <AuroraGlow active={isLoading} />

                      <div className="rounded-3xl glass-heavy overflow-hidden relative">
                        {/* Header — subtle gradient accent when loading */}
                        <div className="relative overflow-hidden">
                          <AnimatePresence>
                            {isLoading && (
                              <motion.div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background:
                                    'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(236,72,153,0.04) 50%, transparent 100%)',
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.4 }}
                              />
                            )}
                          </AnimatePresence>

                          <div
                            className="flex items-center justify-between px-5 pt-4 pb-3"
                            style={{ borderBottom: '1px solid var(--border-subtle)' }}
                          >
                            <h2 className="text-[13px] font-medium text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                              <motion.span
                                animate={isLoading ? { rotate: [0, 15, -10, 0] } : { rotate: 0 }}
                                transition={{ duration: 2.5, repeat: isLoading ? Infinity : 0, ease: 'easeInOut' }}
                                className="flex items-center"
                              >
                                <SvgIcon svg={sparkleSvg} size={14} />
                              </motion.span>
                              AI Summary
                            </h2>

                            <div className="flex items-center gap-1">
                              {/* Status chip */}
                              <AnimatePresence mode="wait">
                                {isLoading ? (
                                  <motion.span
                                    key="analyzing"
                                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                      background: 'rgba(99,102,241,0.1)',
                                      color: '#818cf8',
                                      border: '1px solid rgba(99,102,241,0.2)',
                                    }}
                                    initial={{ opacity: 0, scale: 0.85 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.85 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    Analyzing
                                  </motion.span>
                                ) : (
                                  <motion.span
                                    key="done"
                                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                      background: 'rgba(16,185,129,0.1)',
                                      color: '#34d399',
                                      border: '1px solid rgba(16,185,129,0.2)',
                                    }}
                                    initial={{ opacity: 0, scale: 0.85 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.85 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    Done
                                  </motion.span>
                                )}
                              </AnimatePresence>

                              <button
                                onClick={handleClose}
                                className="ml-1 w-6 h-6 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150"
                                aria-label="Close"
                              >
                                <SvgIcon svg={closeSvg} size={12} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="px-5 py-4">
                          <SummaryContent
                            key={summaryKey}
                            isLoading={isLoading}
                            loadingDuration={LOADING_DURATION}
                            onRegenerate={handleRegenerate}
                          />
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