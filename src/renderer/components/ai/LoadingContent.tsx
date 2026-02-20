import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import sparkleSvg from '@/assets/icons/Weather/Sparkle.svg?raw'
import { useRotatingAngle } from './useRotatingAngle'
import { CONTENT_HEIGHT } from './constants'

const STEPS = [
  'Thinking…',
  'Reading stuff…',
  'Crying a little…',
  'Having an existential crisis…',
  'Consulting the stars…',
  'Asking my therapist…',
  'Almost there, probably…',
  'Pretending to be smart…',
  'Doing brain things…',
  'Summarizing furiously…',
  'Googling the answer…',
  'Panic mode activated…',
  'Bribing the neurons…',
  'Downloading more RAM…',
  'Questioning life choices…',
  'Sending thoughts and prayers…',
  'Reticulating splines…',
  'Warming up the hamster wheel…',
  'Just one more minute, promise…',
  'Making stuff up… I mean summarizing…',
]

const STEP_INTERVAL = 2500 // ms per step

export function LoadingContent({ duration: _duration }: { duration: number }): React.JSX.Element {
  const [step, setStep] = useState(0)
  const auroraRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(
      () => setStep((s) => (s + 1) % STEPS.length),
      STEP_INTERVAL,
    )
    return () => clearInterval(interval)
  }, [])

  // ~7 seconds per revolution — Apple's pace, not a disco light
  useRotatingAngle(auroraRef, true, 0.085)

  return (
    <div className="flex flex-col items-center justify-center gap-5" style={{ height: CONTENT_HEIGHT }}>

      {/* Icon sitting in a pool of aurora light */}
      <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>

        {/* Blurred conic-gradient reads as ambient color shift at this blur radius */}
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

        {/* Sparkle icon — slow, calm breath */}
        <motion.div
          className="relative z-10 flex items-center justify-center"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
          style={{
            color: 'white',
            opacity: 0.5,
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
