import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
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

const STEP_INTERVAL = 2500

const SIRI_BLOBS = [
  { color: 'rgba(24, 75, 255, 0.95)',  r: 0.46, sx: 0.8, sy: 0.6, px: 0,   py: 1.5, a: 10 },
  { color: 'rgba(236, 40, 150, 0.9)',  r: 0.42, sx: 0.5, sy: 0.9, px: 2.1, py: 0.5, a: 12 },
  { color: 'rgba(145, 50, 240, 0.85)', r: 0.44, sx: 0.7, sy: 0.4, px: 4.2, py: 2.8, a: 10 },
  { color: 'rgba(0, 210, 255, 0.7)',   r: 0.36, sx: 0.9, sy: 0.8, px: 1.1, py: 3.3, a: 8  },
]

function useFluidOrb(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const rafRef = useRef<number | null>(null)
  const timeRef = useRef(0)
  const lastRef = useRef(performance.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height

    const frame = (now: number) => {
      const dt = (now - lastRef.current) * 0.001
      lastRef.current = now
      timeRef.current += dt * 0.85

      ctx.clearRect(0, 0, W, H)
      const cx = W / 2, cy = H / 2, t = timeRef.current

      SIRI_BLOBS.forEach(b => {
        const x = cx + Math.sin(t * b.sx + b.px) * b.a
        const y = cy + Math.cos(t * b.sy + b.py) * b.a
        const radius = Math.min(W, H) * b.r
        const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
        g.addColorStop(0, b.color)
        g.addColorStop(0.4, b.color.replace(/[\d.]+\)$/, '0.4)'))
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [canvasRef])
}

export function LoadingContent({ duration: _duration }: { duration: number }): React.JSX.Element {
  const [step, setStep] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const interval = setInterval(
      () => setStep(s => (s + 1) % STEPS.length),
      STEP_INTERVAL,
    )
    return () => clearInterval(interval)
  }, [])

  useFluidOrb(canvasRef)

  return (
    <div className="flex flex-col items-center justify-center gap-5" style={{ height: CONTENT_HEIGHT }}>

      {/* Orb — no clip, blur creates the soft boundary */}
<div
  style={{
    position: 'relative',
    width: 64,
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <filter id="orb-warp" x="-50%" y="-50%" width="200%" height="200%">
        <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="2" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>

  <canvas
    ref={canvasRef}
    width={120}
    height={120}
    style={{
      position: 'absolute',
      width: 120,
      height: 120,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      filter: 'url(#orb-warp) blur(12px) saturate(1.5)',
    }}
  />
</div>

      {/* Step label */}
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