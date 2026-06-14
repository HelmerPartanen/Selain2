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

// Richer palette: deep indigo · rose · violet · cyan · warm amber accent
const SIRI_BLOBS = [
  { color: 'rgba(79,70,229,0.95)',  r: 0.48, sx: 0.80, sy: 0.60, px: 0.0, py: 1.5, a: 14 },
  { color: 'rgba(219,39,119,0.90)', r: 0.44, sx: 0.50, sy: 0.90, px: 2.1, py: 0.5, a: 16 },
  { color: 'rgba(139,92,246,0.85)', r: 0.46, sx: 0.70, sy: 0.40, px: 4.2, py: 2.8, a: 12 },
  { color: 'rgba(6,182,212,0.65)',  r: 0.38, sx: 0.90, sy: 0.80, px: 1.1, py: 3.3, a: 10 },
  { color: 'rgba(245,158,11,0.38)', r: 0.30, sx: 1.20, sy: 0.55, px: 3.3, py: 1.9, a: 7  },
]

function useFluidOrb(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const rafRef  = useRef<number | null>(null)
  const timeRef = useRef(0)
  const lastRef = useRef(performance.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height

    const frame = (now: number) => {
      const dt = (now - lastRef.current) * 0.001
      lastRef.current  = now
      timeRef.current += dt * 0.65          // slower → more meditative feel

      ctx.clearRect(0, 0, W, H)
      const cx = W / 2, cy = H / 2, t = timeRef.current

      SIRI_BLOBS.forEach(b => {
        const x = cx + Math.sin(t * b.sx + b.px) * b.a
        const y = cy + Math.cos(t * b.sy + b.py) * b.a
        const radius = Math.min(W, H) * b.r
        const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
        g.addColorStop(0,    b.color)
        g.addColorStop(0.45, b.color.replace(/[\d.]+\)$/, '0.35)'))
        g.addColorStop(1,    'rgba(0,0,0,0)')
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

// Tiny glowing dot positioned at the top of its container so it orbits as the container rotates
function OrbitDot({ size, color, glow }: { size: number; color: string; glow: string }) {
  return (
    <div
      style={{
        position: 'absolute', top: 0, left: '50%',
        transform: 'translate(-50%, -50%)',
        width: size, height: size, borderRadius: '50%',
        background: color, boxShadow: glow,
      }}
    />
  )
}

export function LoadingContent({ duration: _duration }: { duration: number }): React.JSX.Element {
  const [step, setStep] = useState(0)
  const canvasRef       = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % STEPS.length), STEP_INTERVAL)
    return () => clearInterval(id)
  }, [])

  useFluidOrb(canvasRef)

  return (
    <div className="flex flex-col items-center justify-center gap-6" style={{ height: CONTENT_HEIGHT }}>

      {/* ── Orb system ─────────────────────────────────────── */}
      <div style={{ position: 'relative', width: 76, height: 76 }}>

        {/* SVG displacement filter */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <filter id="orb-warp" x="-60%" y="-60%" width="220%" height="220%">
              <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" seed="5" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        {/* Canvas orb (extends beyond container; blur+displacement creates soft edge) */}
        <canvas
          ref={canvasRef}
          width={160}
          height={160}
          style={{
            position: 'absolute', width: 160, height: 160,
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            filter: 'url(#orb-warp) blur(1.5px) saturate(1.7) brightness(1.06)',
          }}
        />
      </div>

      {/* ── Status text ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.span
          key={step}
          style={{
            fontSize: 12, fontWeight: 300, letterSpacing: '0.03em',
            // Gradient: slate → violet → slate
            background: 'linear-gradient(90deg, #64748b 0%, #c4b5fd 55%, #64748b 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}
          initial={{ opacity: 0, y:  6, filter: 'blur(5px)' }}
          animate={{ opacity: 1, y:  0, filter: 'blur(0px)' }}
          exit   ={{ opacity: 0, y: -6, filter: 'blur(5px)' }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {STEPS[step]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}