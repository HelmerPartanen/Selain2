import { useEffect, useRef, useState } from 'react'

/**
 * RainbowEdgeLoading
 * A soft rainbow glow that "explodes" outward from the bottom-right
 * corner of the screen, accompanied by a shockwave ring that briefly
 * blurs whatever it passes over, then settles into a slow ambient
 * rotation — like the corner is the source of the light.
 */

const RAINBOW_GRADIENT =
  'conic-gradient(from 90deg, #FFE066, #FF8FB1, #FF6FD8, #C77DFF, #6FA8FF, #6FE3C9, #C8F06F, #FFE066)'

// How long the shockwave takes to travel from the corner past the
// far edge of the screen.
const SHOCKWAVE_DURATION = 900
// Thickness of the blurred ring, as a percentage of the screen
// diagonal (the ring spans roughly +/- this value around its radius).
const SHOCKWAVE_BAND = 12

export function RainbowEdgeLoading(): React.JSX.Element {
  // Toggle the "exploded" class shortly after mount so the CSS
  // animation reliably runs (avoids edge cases where an animation
  // starting at mount time gets skipped by the browser).
  const [exploded, setExploded] = useState(false)
  const shockRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setExploded(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Drive the shockwave ring's radius via rAF so it sweeps smoothly
  // from the bottom-right corner across the whole screen and fades
  // out once it's off-screen.
  useEffect(() => {
    const el = shockRef.current
    if (!el) return

    let start: number | null = null
    let raf = 0

    const tick = (t: number) => {
      if (start === null) start = t
      const elapsed = t - start
      const progress = Math.min(elapsed / SHOCKWAVE_DURATION, 1)
      // ease-out cubic, so it starts fast (the "blast") and slows
      // as it dissipates
      const eased = 1 - Math.pow(1 - progress, 3)
      const radius = eased * (100 + SHOCKWAVE_BAND * 2)

      el.style.setProperty('--shock-r', `${radius}%`)
      el.style.opacity = progress < 1 ? '1' : '0'

      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const shockwaveMask = `radial-gradient(circle at 100% 100%, transparent calc(var(--shock-r) - ${SHOCKWAVE_BAND}%), rgba(0,0,0,0.85) var(--shock-r), transparent calc(var(--shock-r) + ${SHOCKWAVE_BAND}%))`

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <style>{`
        @keyframes rainbow-burst {
          0% {
            transform: translate(50%, 50%) scale(0.05);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          55% {
            transform: translate(50%, 50%) scale(1.18);
          }
          100% {
            transform: translate(50%, 50%) scale(1);
          }
        }

        @keyframes rainbow-drift {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(180deg) scale(1.08);
          }
          100% {
            transform: rotate(360deg) scale(1);
          }
        }

        .rainbow-burst-layer {
          animation: rainbow-burst 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .rainbow-drift-layer {
          animation: rainbow-drift 50s linear infinite;
          animation-delay: 1.1s;
        }
      `}</style>

      {/* Blurred wrapper, slightly oversized so the heavy blur never
          shows a hard edge at the screen boundary. */}
      <div
        className="absolute -inset-[20%]"
        style={{ filter: 'blur(90px)' }}
      >
        {/* Burst layer: scales up from a point at the bottom-right
            corner with a slight overshoot, then holds. */}
        <div
          className={exploded ? 'rainbow-burst-layer' : ''}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: '180vmax',
            height: '180vmax',
            transformOrigin: '100% 100%',
            transform: exploded ? undefined : 'translate(50%, 50%) scale(0.05)',
            opacity: exploded ? undefined : 0,
          }}
        >
          {/* Drift layer: once settled, slowly rotates/breathes so the
              glow feels alive without being distracting. */}
          <div
            className={exploded ? 'rainbow-drift-layer' : ''}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: RAINBOW_GRADIENT,
              opacity: 0.2,
            }}
          />
        </div>
      </div>

      {/* Subtle white wash to keep the center calm and push the color
          toward the edges/corner, matching the reference clip. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(255, 0, 240, 0.35) 0%, transparent 55%)',
        }}
      />

      {/* Shockwave: a ring-shaped blur that travels from the
          bottom-right corner outward across the screen, briefly
          softening everything underneath it as it passes. */}
      <div
        ref={shockRef}
        className="absolute inset-0"
        style={
          {
            '--shock-r': '0%',
            backdropFilter: 'blur(36px) saturate(1.15) brightness(1.04)',
            WebkitBackdropFilter: 'blur(36px) saturate(1.15) brightness(1.04)',
            maskImage: shockwaveMask,
            WebkitMaskImage: shockwaveMask,
            transition: 'opacity 0.25s ease-out',
          } as React.CSSProperties
        }
      />
    </div>
  )
}

export default RainbowEdgeLoading