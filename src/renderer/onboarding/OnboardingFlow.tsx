// ─── Onboarding Flow ─────────────────────────────────────────────────────────
// First-run experience: introduces core value, guides mental models,
// and lets the user configure theme + privacy defaults.
// Uses spring-physics shape-morphing for premium, tactile transitions.

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { useSettingsStore } from '@/store/settingsStore'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import shieldSvg from '@/assets/icons/Objects/Shield.svg?raw'
import checkSvg from '@/assets/icons/Interface/Check.svg?raw'
import arrowSvg from '@/assets/icons/Arrows/Right_Small.svg?raw'

// ─── Physics & Motion Constants ──────────────────────────────────────────────

const SPRING = { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.8 }
const SPRING_SOFT = { type: 'spring' as const, stiffness: 300, damping: 30, mass: 1 }
const FADE = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const }

// Card dimensions morph per step for shape-morphing effect
const STEP_DIMENSIONS: { width: number; height: number }[] = [
  { width: 440, height: 340 },  // Welcome
  { width: 520, height: 400 },  // Theme
  { width: 480, height: 360 },  // Privacy
  { width: 440, height: 320 },  // Ready
]

// ─── Step Definitions ────────────────────────────────────────────────────────

const TOTAL_STEPS = 4

// ─── Shared Sub-Components ───────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          animate={{
            width: i === current ? 20 : 6,
            height: 6,
            backgroundColor: i === current
              ? 'var(--dot-active, #6366f1)'
              : i < current
                ? 'var(--dot-done, #a5b4fc)'
                : 'var(--dot-idle, #d1d5db)',
          }}
          transition={SPRING}
        />
      ))}
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING}
      className="
        inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-medium
        bg-indigo-500 dark:bg-indigo-400 text-white dark:text-black
        shadow-sm hover:shadow-md transition-shadow duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2
      "
    >
      {children}
    </motion.button>
  )
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING}
      className="
        inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium
        text-gray-500 dark:text-neutral-400
        hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2
      "
    >
      {children}
    </motion.button>
  )
}

// ─── Step 0 — Welcome ────────────────────────────────────────────────────────

function WelcomeStep(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      {/* Morphing logo shape */}
      <motion.div
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 dark:from-indigo-400 dark:to-violet-400 flex items-center justify-center shadow-lg"
        initial={{ scale: 0, rotate: -180, borderRadius: '50%' }}
        animate={{ scale: 1, rotate: 0, borderRadius: '28%' }}
        transition={{ ...SPRING, stiffness: 300, damping: 22 }}
      >
        <motion.span
          className="text-white text-2xl font-bold select-none"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING, delay: 0.15 }}
        >
          C
        </motion.span>
      </motion.div>

      <div className="space-y-2">
        <motion.h1
          className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...FADE, delay: 0.1 }}
        >
          Welcome to Chromium
        </motion.h1>
        <motion.p
          className="text-[13px] text-gray-500 dark:text-neutral-400 leading-relaxed max-w-[320px]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...FADE, delay: 0.2 }}
        >
          A focused, minimal browser designed for speed, privacy, and clarity.
          Let's set things up in a few seconds.
        </motion.p>
      </div>
    </div>
  )
}

// ─── Step 1 — Theme Selection ────────────────────────────────────────────────

function ThemeStep(): React.JSX.Element {
  const themeMode = useThemeStore((s) => s.themeMode)
  const setThemeMode = useThemeStore((s) => s.setThemeMode)

  const themes: { id: ThemeMode; label: string; description: string }[] = useMemo(() => [
    { id: 'light', label: 'Light', description: 'Clean and bright' },
    { id: 'dark', label: 'Dark', description: 'Easy on the eyes' },
    { id: 'system', label: 'System', description: 'Follows your OS' },
  ], [])

  return (
    <div className="flex flex-col items-center text-center gap-5">
      <div className="space-y-2">
        <motion.h2
          className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={FADE}
        >
          Choose your look
        </motion.h2>
        <motion.p
          className="text-[13px] text-gray-500 dark:text-neutral-400"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...FADE, delay: 0.08 }}
        >
          You can always change this later in Settings.
        </motion.p>
      </div>

      <div className="flex gap-3">
        {themes.map(({ id, label, description }, i) => {
          const selected = themeMode === id
          return (
            <motion.button
              key={id}
              onClick={() => setThemeMode(id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_SOFT, delay: 0.06 * i }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`
                relative flex flex-col items-center gap-2 w-[130px] p-4 rounded-2xl border-2 transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2
                ${selected
                  ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-500/10'
                  : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
                }
              `}
              aria-pressed={selected}
            >
              {/* Theme preview swatch */}
              <div className={`
                w-full h-14 rounded-xl overflow-hidden border
                ${id === 'light' ? 'bg-gray-50 border-gray-200' : ''}
                ${id === 'dark' ? 'bg-neutral-800 border-neutral-700' : ''}
                ${id === 'system' ? 'bg-gradient-to-r from-gray-50 to-neutral-800 border-gray-300 dark:border-neutral-600' : ''}
              `}>
                <div className="w-full h-full flex items-end p-2 gap-1">
                  {[1, 0.7, 0.4].map((opacity, j) => (
                    <div
                      key={j}
                      className={`h-1 rounded-full flex-1 ${id === 'dark' ? 'bg-white' : id === 'light' ? 'bg-gray-900' : j === 0 ? 'bg-gray-900' : 'bg-white'}`}
                      style={{ opacity }}
                    />
                  ))}
                </div>
              </div>

              <span className="text-[12px] font-medium text-gray-900 dark:text-white">{label}</span>
              <span className="text-[11px] text-gray-400 dark:text-neutral-500">{description}</span>

              {/* Selection indicator */}
              <AnimatePresence>
                {selected && (
                  <motion.div
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-indigo-500 dark:bg-indigo-400 flex items-center justify-center shadow-sm"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={SPRING}
                  >
                    <SvgIcon svg={checkSvg} size={11} className="text-white dark:text-black" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 2 — Privacy ────────────────────────────────────────────────────────

function PrivacyStep(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <motion.div
        className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING}
      >
        <SvgIcon svg={shieldSvg} size={28} className="text-emerald-500 dark:text-emerald-400" />
      </motion.div>

      <div className="space-y-2">
        <motion.h2
          className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={FADE}
        >
          Privacy built in
        </motion.h2>
        <motion.p
          className="text-[13px] text-gray-500 dark:text-neutral-400 leading-relaxed max-w-[340px]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...FADE, delay: 0.08 }}
        >
          Chromium includes a built-in ad blocker powered by uBlock Origin.
          Trackers and intrusive ads are blocked by default — no extensions needed.
        </motion.p>
      </div>

      {/* Privacy features list */}
      <motion.div
        className="flex flex-col gap-2 w-full max-w-[320px]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...FADE, delay: 0.15 }}
      >
        {[
          'Ad & tracker blocking enabled',
          'No telemetry or analytics',
          'Local-first data storage',
        ].map((feature, i) => (
          <motion.div
            key={feature}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800 text-left"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING_SOFT, delay: 0.2 + i * 0.06 }}
          >
            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <SvgIcon svg={checkSvg} size={10} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[12px] font-medium text-gray-700 dark:text-neutral-300">{feature}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

// ─── Step 3 — Ready ──────────────────────────────────────────────────────────

function ReadyStep(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <motion.div
        className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...SPRING, stiffness: 350, damping: 20 }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...SPRING, delay: 0.12, stiffness: 400, damping: 18 }}
        >
          <SvgIcon svg={checkSvg} size={28} className="text-indigo-500 dark:text-indigo-400" />
        </motion.div>
      </motion.div>

      <div className="space-y-2">
        <motion.h2
          className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...FADE, delay: 0.08 }}
        >
          You're all set
        </motion.h2>
        <motion.p
          className="text-[13px] text-gray-500 dark:text-neutral-400 leading-relaxed max-w-[300px]"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...FADE, delay: 0.15 }}
        >
          Chromium is ready. Browse with focus, speed, and peace of mind.
        </motion.p>
      </div>
    </div>
  )
}

// ─── Step Router ─────────────────────────────────────────────────────────────

function StepContent({ step }: { step: number }): React.JSX.Element {
  switch (step) {
    case 0: return <WelcomeStep />
    case 1: return <ThemeStep />
    case 2: return <PrivacyStep />
    case 3: return <ReadyStep />
    default: return <WelcomeStep />
  }
}

// ─── Main Onboarding Flow ────────────────────────────────────────────────────

function OnboardingFlowInner(): React.JSX.Element {
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward

  const isFirst = step === 0
  const isLast = step === TOTAL_STEPS - 1

  const next = useCallback(() => {
    if (isLast) {
      setOnboardingCompleted(true)
      return
    }
    setDirection(1)
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }, [isLast, setOnboardingCompleted])

  const back = useCallback(() => {
    setDirection(-1)
    setStep((s) => Math.max(s - 1, 0))
  }, [])

  const skip = useCallback(() => {
    setOnboardingCompleted(true)
  }, [setOnboardingCompleted])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft' && !isFirst) back()
      else if (e.key === 'Escape') skip()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, back, skip, isFirst])

  const dims = STEP_DIMENSIONS[step] ?? STEP_DIMENSIONS[0]!

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white dark:bg-neutral-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={FADE}
      role="dialog"
      aria-label="Welcome to Chromium"
      aria-modal="true"
    >
      {/* Subtle radial gradient backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-50/40 via-transparent to-transparent dark:from-indigo-500/5 dark:via-transparent dark:to-transparent pointer-events-none" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Shape-morphing card container */}
        <motion.div
          className="relative bg-white dark:bg-neutral-900 border border-gray-200/80 dark:border-neutral-700/80 rounded-3xl shadow-xl overflow-hidden flex items-center justify-center"
          animate={{
            width: dims.width,
            height: dims.height,
          }}
          transition={SPRING_SOFT}
          layout
        >
          {/* Animated step content */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={{
                enter: (d: number) => ({
                  opacity: 0,
                  x: d * 40,
                  scale: 0.96,
                }),
                center: {
                  opacity: 1,
                  x: 0,
                  scale: 1,
                },
                exit: (d: number) => ({
                  opacity: 0,
                  x: d * -40,
                  scale: 0.96,
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SPRING}
              className="absolute inset-0 flex items-center justify-center p-8"
            >
              <StepContent step={step} />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Progress dots */}
        <ProgressDots current={step} total={TOTAL_STEPS} />

        {/* Navigation controls */}
        <motion.div
          className="flex items-center gap-3"
          layout
          transition={SPRING}
        >
          {!isFirst && (
            <SecondaryButton onClick={back}>Back</SecondaryButton>
          )}
          <PrimaryButton onClick={next}>
            {isFirst ? 'Get Started' : isLast ? 'Start Browsing' : 'Continue'}
            <SvgIcon svg={isLast ? checkSvg : arrowSvg} size={14} />
          </PrimaryButton>
        </motion.div>

        {/* Skip link */}
        <motion.button
          onClick={skip}
          className="text-[12px] text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 rounded-md px-2 py-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...FADE, delay: 0.4 }}
        >
          Skip setup
        </motion.button>
      </div>
    </motion.div>
  )
}

export const OnboardingFlow = memo(OnboardingFlowInner)
