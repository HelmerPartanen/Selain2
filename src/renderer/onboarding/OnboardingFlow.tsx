// ─── Onboarding Flow ─────────────────────────────────────────────────────────
// Full-screen immersive first-run experience.
// Ambient gradient orbs + staggered typography + spring-physics transitions.
//
// Design intent: premium, calm, intentional. Apple-level tactility.
// Every animation communicates structure — nothing decorative.
//
// Steps: Welcome → Appearance → Privacy → Ready

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon, SQUARE_SVG, CARDS_SVG } from '@/components/ui/SvgIcon'
import { useSettingsStore } from '@/store/settingsStore'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import { WALLPAPER_PRESETS, PRESET_PREFIX } from '@/theme/presets'
import { SPRING, SPRING_GENTLE, SPRING_ORB, SPRING_SNAPPY } from '@/utils/springs'
import shieldSvg from '@/assets/icons/Objects/Shield.svg?raw'
import checkSvg from '@/assets/icons/Interface/Check.svg?raw'
import chevronRightSvg from '@/assets/icons/Arrows/Chevron_Right.svg?raw'
import chevronLeftSvg from '@/assets/icons/Arrows/Chevron_Left.svg?raw'
import minusSvg from '@/assets/icons/Maths/Minus.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'

// ─── Motion Constants ────────────────────────────────────────────────────────
// Core spring matches SettingsPanel: { stiffness: 400, damping: 28, mass: 0.8 }
// Gentler variants for large-scale ambient motion and text reveals.

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

const TOTAL_STEPS = 4

// ─── Ambient Orb System ──────────────────────────────────────────────────────
// Three soft radial-gradient circles float behind content.
// Positions + hues shift per step with very slow springs so the
// background feels alive without being distracting.
// Using radial-gradient avoids expensive filter:blur — GPU-friendly.

interface OrbDef {
  x: string
  y: string
  size: number
  hue: string
}

const ORB_STEPS: OrbDef[][] = [
  // Welcome — indigo / violet (brand)
  [
    { x: '18%', y: '20%', size: 550, hue: '#6366f1' },
    { x: '76%', y: '66%', size: 440, hue: '#8b5cf6' },
    { x: '54%', y: '8%', size: 340, hue: '#3b82f6' },
  ],
  // Appearance — purple / pink shift
  [
    { x: '26%', y: '32%', size: 500, hue: '#8b5cf6' },
    { x: '72%', y: '54%', size: 460, hue: '#a855f7' },
    { x: '44%', y: '78%', size: 300, hue: '#ec4899' },
  ],
  // Privacy — emerald / teal
  [
    { x: '22%', y: '24%', size: 520, hue: '#10b981' },
    { x: '74%', y: '62%', size: 400, hue: '#34d399' },
    { x: '50%', y: '14%', size: 340, hue: '#6366f1' },
  ],
  // Ready — warm indigo, cinematic bloom
  [
    { x: '34%', y: '30%', size: 600, hue: '#6366f1' },
    { x: '66%', y: '52%', size: 500, hue: '#8b5cf6' },
    { x: '42%', y: '72%', size: 380, hue: '#4f46e5' },
  ],
]

function AmbientOrbs({ step }: { step: number }): React.JSX.Element {
  const orbs = ORB_STEPS[step] ?? ORB_STEPS[0]!
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-[0.15] dark:opacity-[0.07]"
          animate={{ left: orb.x, top: orb.y }}
          transition={SPRING_ORB}
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle at center, ${orb.hue} 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  )
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
// Thin, elegant bar — replaces clunky dot indicators.

function ProgressBar({ step, total }: { step: number; total: number }): React.JSX.Element {
  return (
    <div
      className="w-48 h-[3px] rounded-full bg-gray-200/50 dark:bg-neutral-700/30 overflow-hidden"
      role="progressbar"
      aria-valuenow={step + 1}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      <motion.div
        className="h-full rounded-full bg-gray-400/60 dark:bg-white/20"
        animate={{ width: `${((step + 1) / total) * 100}%` }}
        transition={SPRING}
      />
    </div>
  )
}

// ─── Staggered Text ──────────────────────────────────────────────────────────
// Each word fades up individually with a stagger delay.
// Creates the Apple-keynote "words appearing as spoken" effect.

function StaggeredWords({
  text,
  className = '',
  stagger = 0.06,
  delay = 0,
  as: Tag = 'span',
}: {
  text: string
  className?: string
  stagger?: number
  delay?: number
  as?: 'h1' | 'h2' | 'p' | 'span'
}): React.JSX.Element {
  const words = text.split(' ')
  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block"
          style={{ marginRight: '0.28em' }}
          initial={{ opacity: 0, y: 22, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            opacity: { duration: 0.55, delay: delay + i * stagger, ease: EASE_OUT },
            y: { ...SPRING_GENTLE, delay: delay + i * stagger },
            filter: { duration: 0.45, delay: delay + i * stagger, ease: EASE_OUT },
          }}
        >
          {word}
        </motion.span>
      ))}
    </Tag>
  )
}

// ─── Fade-Up ─────────────────────────────────────────────────────────────────
// Simple block-level fade+rise for subtitles and descriptions.

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}): React.JSX.Element {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}

// ─── Step 0 — Welcome ────────────────────────────────────────────────────────

function WelcomeStep(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center text-center gap-8">

      {/* Hero text — staggered word reveal */}
      <div className="space-y-4">
        <StaggeredWords
          text="Welcome"
          as="h1"
          className="text-[42px] font-semibold tracking-tight text-gray-900 dark:text-white leading-[1.08]"
          delay={0.25}
          stagger={0.07}
        />
        <FadeUp delay={0.7}>
          <p className="text-[16px] text-gray-500 dark:text-neutral-400 leading-relaxed max-w-[380px] mx-auto">
            A browser designed around what matters most —{' '}
            <span className="text-gray-700 dark:text-neutral-300">speed</span>,{' '}
            <span className="text-gray-700 dark:text-neutral-300">clarity</span>, and{' '}
            <span className="text-gray-700 dark:text-neutral-300">your privacy</span>.
          </p>
        </FadeUp>
      </div>
    </div>
  )
}

// ─── Step 1 — Appearance ─────────────────────────────────────────────────────
// Improved theme cards: richer hover states, glow ring, depth, tactile feel.

function BrowserMockup({ mode }: { mode: 'light' | 'dark' }): React.JSX.Element {
  const isLight = mode === 'light'
  const chrome = isLight ? 'bg-gray-100' : 'bg-neutral-800'
  const body = isLight ? 'bg-white' : 'bg-neutral-900'
  const line1 = isLight ? 'bg-gray-200' : 'bg-neutral-700'
  const line2 = isLight ? 'bg-gray-200/60' : 'bg-neutral-700/60'
  const pill = isLight ? 'bg-white' : 'bg-neutral-700'
  const border = isLight ? 'border-gray-200' : 'border-neutral-700'

  return (
    <div className={`w-full rounded-xl overflow-hidden border ${border} ${isLight ? 'bg-gray-50' : 'bg-neutral-900'}`}>
      {/* Window chrome */}
      <div className={`flex items-center gap-1.5 px-2.5 py-[7px] ${chrome}`}>
        <div className="flex gap-[5px]">
          <div className="w-[7px] h-[7px] rounded-full bg-[#ff5f57]/60" />
          <div className="w-[7px] h-[7px] rounded-full bg-[#febc2e]/60" />
          <div className="w-[7px] h-[7px] rounded-full bg-[#28c840]/60" />
        </div>
        <div className={`flex-1 h-[14px] rounded-md ml-2 ${pill}`} />
      </div>
      {/* URL row */}
      <div className={`px-2.5 py-[6px] ${body}`}>
        <div className={`h-[16px] rounded-lg ${isLight ? 'bg-gray-50' : 'bg-neutral-800'}`} />
      </div>
      {/* Content skeleton */}
      <div className={`px-2.5 pb-3 pt-1 space-y-[6px] ${body}`}>
        <div className={`h-[4px] rounded-full w-[82%] ${line1}`} />
        <div className={`h-[4px] rounded-full w-[56%] ${line2}`} />
        <div className={`h-[4px] rounded-full w-[70%] ${line1}`} />
      </div>
    </div>
  )
}

function SystemMockup(): React.JSX.Element {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-300 dark:border-neutral-600">
      {/* Window chrome — split light/dark */}
      <div className="flex">
        <div className="w-1/2 flex items-center gap-1.5 px-2.5 py-[7px] bg-gray-100">
          <div className="flex gap-[5px]">
            <div className="w-[7px] h-[7px] rounded-full bg-[#ff5f57]/60" />
            <div className="w-[7px] h-[7px] rounded-full bg-[#febc2e]/60" />
            <div className="w-[7px] h-[7px] rounded-full bg-[#28c840]/60" />
          </div>
          <div className="flex-1 h-[14px] rounded-md ml-2 bg-white" />
        </div>
        <div className="w-1/2 flex items-center px-2.5 py-[7px] bg-neutral-800">
          <div className="flex-1 h-[14px] rounded-md bg-neutral-700" />
        </div>
      </div>
      {/* URL row — split */}
      <div className="flex">
        <div className="w-1/2 px-2.5 py-[6px] bg-white">
          <div className="h-[16px] rounded-lg bg-gray-50" />
        </div>
        <div className="w-1/2 px-2.5 py-[6px] bg-neutral-900">
          <div className="h-[16px] rounded-lg bg-neutral-800" />
        </div>
      </div>
      {/* Content skeleton — split */}
      <div className="flex">
        <div className="w-1/2 px-2.5 pb-3 pt-1 space-y-[6px] bg-white">
          <div className="h-[4px] rounded-full w-[82%] bg-gray-200" />
          <div className="h-[4px] rounded-full w-[56%] bg-gray-200/60" />
          <div className="h-[4px] rounded-full w-[70%] bg-gray-200" />
        </div>
        <div className="w-1/2 px-2.5 pb-3 pt-1 space-y-[6px] bg-neutral-900">
          <div className="h-[4px] rounded-full w-[82%] bg-neutral-700" />
          <div className="h-[4px] rounded-full w-[56%] bg-neutral-700/60" />
          <div className="h-[4px] rounded-full w-[70%] bg-neutral-700" />
        </div>
      </div>
    </div>
  )
}

function AppearanceStep(): React.JSX.Element {
  const themeMode = useThemeStore((s) => s.themeMode)
  const setThemeMode = useThemeStore((s) => s.setThemeMode)

  const themes: { id: ThemeMode; label: string }[] = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'system', label: 'System' },
  ]

  return (
    <div className="flex flex-col items-center text-center gap-8">
      <div className="space-y-3">
        <StaggeredWords
          text="Make it yours"
          as="h2"
          className="text-[32px] font-semibold tracking-tight text-gray-900 dark:text-white"
          delay={0.05}
        />
        <FadeUp delay={0.28}>
          <p className="text-[14px] text-gray-500 dark:text-neutral-400">
            Choose your preferred appearance. You can change this anytime.
          </p>
        </FadeUp>
      </div>

      {/* Card tray — subtle inset surface to ground the cards */}
      <div className="
        flex gap-3 p-3 rounded-[22px]
        bg-gray-100/80 dark:bg-neutral-800/60
        border border-gray-200/60 dark:border-neutral-700/40
        shadow-inner shadow-gray-200/60 dark:shadow-black/20
      ">
        {themes.map(({ id, label }, i) => {
          const selected = themeMode === id

          return (
            <motion.button
              key={id}
              onClick={() => setThemeMode(id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_GENTLE, delay: 0.35 + i * 0.08 }}
              className={`
                relative flex flex-col items-center gap-3 w-[148px] p-3 pb-4 rounded-[16px]
                outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 dark:focus-visible:ring-offset-neutral-800
                transition-[background-color,box-shadow] duration-200 ease-out
                ${selected
                  ? /* selected: white card elevated off the tray */
                    'bg-white dark:bg-neutral-700 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)]'
                  : /* unselected: nearly flush with tray; lifts on hover */
                    'bg-transparent hover:bg-white/70 dark:hover:bg-neutral-700/50 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:hover:shadow-[0_2px_10px_rgba(0,0,0,0.3)]'
                }
              `}
              aria-pressed={selected}
            >
              {/* Glow ring — renders behind the card content, only when selected */}
              <AnimatePresence>
                {selected && (
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-[16px] ring-2 ring-indigo-500 dark:ring-indigo-400"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={SPRING}
                  />
                )}
              </AnimatePresence>

              {/* Subtle indigo tint overlay when selected */}
              <AnimatePresence>
                {selected && (
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-[16px] bg-indigo-500/[0.04] dark:bg-indigo-400/[0.06]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  />
                )}
              </AnimatePresence>

              {id === 'system' ? <SystemMockup /> : <BrowserMockup mode={id} />}

              <span className={`
                text-[13px] font-medium transition-colors duration-150
                ${selected
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-neutral-500'
                }
              `}>
                {label}
              </span>

              {/* Selection check badge */}
              <AnimatePresence>
                {selected && (
                  <motion.div
                    className="absolute -top-2 -right-2 w-[22px] h-[22px] rounded-full bg-indigo-500 dark:bg-indigo-400 flex items-center justify-center shadow-md shadow-indigo-500/40 dark:shadow-indigo-400/30"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 20 }}
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

const PRIVACY_FEATURES = [
  { text: 'Ad & tracker blocking', detail: 'Powered by uBlock Origin' },
  { text: 'No telemetry', detail: 'Nothing leaves your device' },
  { text: 'Local-first storage', detail: 'Your data stays on your machine' },
] as const

function PrivacyStep(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center text-center gap-8">
      {/* Shield with shape-morph entrance */}
      <motion.div
        className="w-[72px] h-[72px] rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center pt-[2px]"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...SPRING, stiffness: 300, damping: 20 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...SPRING, delay: 0.14 }}
        >
          <SvgIcon svg={shieldSvg} size={34} className="text-emerald-500 dark:text-emerald-400" />
        </motion.div>
      </motion.div>

      <div className="space-y-3">
        <StaggeredWords
          text="Privacy, built in"
          as="h2"
          className="text-[32px] font-semibold tracking-tight text-gray-900 dark:text-white"
          delay={0.12}
        />
        <FadeUp delay={0.38}>
          <p className="text-[14px] text-gray-500 dark:text-neutral-400 leading-relaxed max-w-[380px] mx-auto">
            Trackers and intrusive ads are blocked from day one.
            No configuration needed, no extensions required.
          </p>
        </FadeUp>
      </div>

      {/* Feature rows — staggered entrance */}
      <div className="flex flex-col gap-3 w-full max-w-[380px]">
        {PRIVACY_FEATURES.map(({ text, detail }, i) => (
          <motion.div
            key={text}
            className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-white/60 dark:bg-neutral-800/50 border border-gray-100 dark:border-neutral-700/50 text-left"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING_GENTLE, delay: 0.48 + i * 0.1 }}
          >
            <motion.div
              className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...SPRING, delay: 0.58 + i * 0.1 }}
            >
              <SvgIcon svg={checkSvg} size={12} className="text-emerald-600 dark:text-emerald-400" />
            </motion.div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-gray-800 dark:text-neutral-200">{text}</div>
              <div className="text-[11px] text-gray-400 dark:text-neutral-500 mt-0.5">{detail}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Step 3 — Ready ──────────────────────────────────────────────────────────

function ReadyStep(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center text-center gap-8">
      {/* Bouncy checkmark reveal */}
      <motion.div
        className="w-[88px] h-[88px] rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...SPRING, stiffness: 280, damping: 18 }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -60 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...SPRING, delay: 0.15, stiffness: 350, damping: 16 }}
        >
          <SvgIcon svg={checkSvg} size={40} className="text-indigo-500 dark:text-indigo-400" />
        </motion.div>
      </motion.div>

      <div className="space-y-4">
        <StaggeredWords
          text="You're ready"
          as="h2"
          className="text-[42px] font-semibold tracking-tight text-gray-900 dark:text-white leading-[1.08]"
          delay={0.18}
          stagger={0.1}
        />
        <FadeUp delay={0.45}>
          <p className="text-[16px] text-gray-500 dark:text-neutral-400 leading-relaxed max-w-[320px] mx-auto">
            Enjoy a faster, cleaner, more private web.
          </p>
        </FadeUp>
      </div>
    </div>
  )
}

// ─── Step Router ─────────────────────────────────────────────────────────────

function StepContent({ step }: { step: number }): React.JSX.Element {
  switch (step) {
    case 0: return <WelcomeStep />
    case 1: return <AppearanceStep />
    case 2: return <PrivacyStep />
    case 3: return <ReadyStep />
    default: return <WelcomeStep />
  }
}

// ─── Window Controls (rendered inside onboarding to stay above z-100) ────────

const HIDE_DELAY = 800

function OnboardingWindowControls(): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const hideTimer = useRef<number>(0)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  useEffect(() => {
    const unsub = window.electronAPI.onMaximizeChange(setIsMaximized)
    return unsub
  }, [])

  useEffect(() => {
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [])

  const handleEnter = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = 0 }
    setIsVisible(true)
  }, [])

  const handleLeave = useCallback(() => {
    hideTimer.current = window.setTimeout(() => {
      setIsVisible(false)
      hideTimer.current = 0
    }, HIDE_DELAY)
  }, [])

  return (
    <motion.div
      className="absolute top-0 right-0 z-10 [app-region:no-drag]"
      style={{ pointerEvents: 'none' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.6, ease: EASE_OUT }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Trigger zone — top-right corner */}
      <div
        className="absolute top-0 right-0 w-12 h-4"
        style={{ pointerEvents: 'auto' }}
      />

      {/* Hint dots — visible when controls are hidden */}
      {!isVisible && (
        <div
          className="absolute top-2.5 right-5 flex gap-1.5 opacity-30 hover:opacity-60 transition-opacity duration-300"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="w-[5px] h-[5px] rounded-full bg-gray-400 dark:bg-neutral-500" />
          <div className="w-[5px] h-[5px] rounded-full bg-gray-400 dark:bg-neutral-500" />
          <div className="w-[5px] h-[5px] rounded-full bg-gray-400 dark:bg-neutral-500" />
        </div>
      )}

      {/* Controls pill */}
      <div
        className={`
          mt-2.5 mr-2.5 flex items-center gap-1 rounded-full
          bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg p-1
          transition-all duration-200 ease-out
          ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.85] -translate-y-1.5'}
        `}
        style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      >
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          aria-label="Minimize"
          onMouseEnter={() => setHoveredIdx(0)}
          onMouseLeave={() => setHoveredIdx(null)}
          className="relative w-7 h-7 rounded-full flex items-center justify-center
            text-gray-600 dark:text-neutral-400
            hover:bg-gray-100 dark:hover:bg-neutral-800
            transition-all duration-75 active:scale-85"
        >
          {hoveredIdx === 0 && (
            <motion.div
              layoutId="window-controls-hover"
              className="absolute inset-0 rounded-full glass bg-white/20 dark:bg-white/6 shadow ring-1 ring-black/5 dark:ring-white/10"
              initial={{ opacity: 0.5, filter: 'blur(2px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(2px)' }}
              transition={SPRING_SNAPPY}
            />
          )}
          <span className="relative z-10"><SvgIcon svg={minusSvg} size={12} /></span>
        </button>
        <button
          onClick={() => window.electronAPI.toggleMaximizeWindow()}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          onMouseEnter={() => setHoveredIdx(1)}
          onMouseLeave={() => setHoveredIdx(null)}
          className="relative w-7 h-7 rounded-full flex items-center justify-center
            text-gray-600 dark:text-neutral-400
            hover:bg-gray-100 dark:hover:bg-neutral-800
            transition-all duration-75 active:scale-85"
        >
          {hoveredIdx === 1 && (
            <motion.div
              layoutId="window-controls-hover"
              className="absolute inset-0 rounded-full glass bg-white/20 dark:bg-white/6 shadow ring-1 ring-black/5 dark:ring-white/10"
              initial={{ opacity: 0.5, filter: 'blur(2px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(2px)' }}
              transition={SPRING_SNAPPY}
            />
          )}
          <span className="relative z-10">
            {isMaximized ? <SvgIcon svg={CARDS_SVG} size={12} /> : <SvgIcon svg={SQUARE_SVG} size={10} />}
          </span>
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          aria-label="Close"
          onMouseEnter={() => setHoveredIdx(2)}
          onMouseLeave={() => setHoveredIdx(null)}
          className="relative w-7 h-7 rounded-full flex items-center justify-center
            text-gray-600 dark:text-neutral-400
            hover:bg-red-200 hover:text-red-500 dark:hover:bg-red-900/50 dark:hover:text-red-400
            transition-all duration-75 active:scale-85"
        >
          {hoveredIdx === 2 && (
            <motion.div
              layoutId="window-controls-hover"
              className="absolute inset-0 rounded-full glass bg-white/20 dark:bg-white/6 shadow ring-1 ring-black/5 dark:ring-white/10"
              initial={{ opacity: 0.5, filter: 'blur(2px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(2px)' }}
              transition={SPRING_SNAPPY}
            />
          )}
          <span className="relative z-10"><SvgIcon svg={closeSvg} size={12} /></span>
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main Orchestrator ───────────────────────────────────────────────────────

function OnboardingFlowInner(): React.JSX.Element {
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted)
  const setWallpaper = useThemeStore((s) => s.setWallpaper)
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isFirst = step === 0
  const isLast = step === TOTAL_STEPS - 1

  // Cleanup exit timer on unmount
  useEffect(() => {
    return () => { if (exitTimer.current) clearTimeout(exitTimer.current) }
  }, [])

  const finish = useCallback(() => {
    if (exiting) return
    setExiting(true)
    // Set the Bloom wallpaper (matches last onboarding orb colors) for a seamless transition
    const bloom = WALLPAPER_PRESETS.find((p) => p.id === 'ready_bloom')
    if (bloom) setWallpaper(`${PRESET_PREFIX}${bloom.id}`)
    exitTimer.current = setTimeout(() => setOnboardingCompleted(true), 550)
  }, [exiting, setOnboardingCompleted, setWallpaper])

  const next = useCallback(() => {
    if (exiting) return
    if (isLast) { finish(); return }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }, [isLast, finish, exiting])

  const back = useCallback(() => {
    if (exiting) return
    setStep((s) => Math.max(s - 1, 0))
  }, [exiting])

  const skip = useCallback(() => finish(), [finish])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (exiting) return
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft' && !isFirst) back()
      else if (e.key === 'Escape') skip()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, back, skip, isFirst, exiting])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-neutral-900 [app-region:no-drag]"
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1, scale: exiting ? 1.04 : 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={
        exiting
          ? { duration: 0.5, ease: EASE_OUT }
          : { duration: 0.35, ease: EASE_OUT }
      }
      role="dialog"
      aria-label="Welcome"
      aria-modal="true"
    >
      {/* Living gradient background */}
      <AmbientOrbs step={step} />

      {/* Skip — top left, very subtle, appears late */}
      <motion.button
        onClick={skip}
        className="
          absolute top-5 left-6 z-10 text-[12px] text-gray-400 dark:text-neutral-500
          hover:text-gray-600 dark:hover:text-neutral-300 transition-colors duration-150
          px-3 py-1.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-neutral-800/50
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
        "
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2, ease: EASE_OUT }}
      >
        Skip
      </motion.button>

      {/* Window controls — top right */}
      <OnboardingWindowControls />

      {/* Step content — centered, full-width */}
      <div className="flex-1 flex items-center justify-center relative z-[1]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{
              opacity: { duration: 0.3, ease: EASE_OUT },
              y: SPRING_GENTLE,
              scale: { duration: 0.35, ease: EASE_OUT },
            }}
            className="w-full max-w-[560px] px-6"
          >
            <StepContent step={step} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom bar — CTA + progress */}
      <motion.div
        className="relative z-[1] flex flex-col items-center gap-6 pb-12"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: EASE_OUT }}
      >
        {/* Action row */}
        <div className="flex items-center gap-3">
          {/* Back — icon-only, hidden on first step */}
          <AnimatePresence>
            {!isFirst && (
              <motion.button
                onClick={back}
                initial={{ opacity: 0, scale: 0.8, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 44 }}
                exit={{ opacity: 0, scale: 0.8, width: 0 }}
                transition={SPRING}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="
                  h-11 rounded-full flex items-center justify-center overflow-hidden
                  text-gray-400 dark:text-neutral-500
                  hover:text-gray-600 dark:hover:text-neutral-300
                  hover:bg-gray-100/60 dark:hover:bg-neutral-800/60
                  transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                "
                aria-label="Go back"
              >
                <SvgIcon svg={chevronLeftSvg} size={18} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Primary CTA */}
          <motion.button
            onClick={next}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
            className="
              inline-flex items-center gap-2 px-8 py-3 rounded-2xl text-[14px] font-medium
              bg-gray-900 dark:bg-white text-white dark:text-gray-900
              shadow-xl shadow-gray-900/12 dark:shadow-black/20
              hover:shadow-2xl hover:shadow-gray-900/18 dark:hover:shadow-black/30
              transition-shadow duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2
            "
          >
            {isFirst ? 'Get Started' : isLast ? 'Start Browsing' : 'Continue'}
            {!isLast && <SvgIcon svg={chevronRightSvg} size={15} />}
            {isLast && <SvgIcon svg={checkSvg} size={15} />}
          </motion.button>
        </div>

        {/* Progress */}
        <ProgressBar step={step} total={TOTAL_STEPS} />
      </motion.div>
    </motion.div>
  )
}

export const OnboardingFlow = memo(OnboardingFlowInner)
