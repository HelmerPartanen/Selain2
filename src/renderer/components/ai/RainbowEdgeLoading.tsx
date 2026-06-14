import { useEffect, useRef } from 'react'

/**
 * RainbowEdgeLoading
 * Renders a rotating rainbow gradient animation on the edges (border) of the screen.
 * Creates a smooth flowing rainbow that cycles through all edges continuously.
 */

function useRotatingRainbow(containerRef: React.RefObject<HTMLDivElement | null>) {
  const rafRef = useRef<number | null>(null)
  const angleRef = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const animate = () => {
      angleRef.current = (angleRef.current + 1) % 360
      container.style.setProperty('--rainbow-rotation', `${angleRef.current}deg`)
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [containerRef])
}

export function RainbowEdgeLoading(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  useRotatingRainbow(containerRef)

  const rainbowGradient = 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000)'

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={
        {
          '--rainbow-rotation': '0deg',
        } as React.CSSProperties
      }
    >
      {/* Top edge bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: rainbowGradient,
          opacity: 0.9,
          boxShadow: '0 0 24px rgba(255, 100, 0, 0.7), 0 0 12px rgba(100, 200, 255, 0.5)',
        }}
      />

      {/* Right edge bar */}
      <div
        className="absolute top-1 right-0 bottom-1 w-1"
        style={{
          background: rainbowGradient,
          opacity: 0.9,
          transform: 'rotate(90deg)',
          transformOrigin: '0 0',
          boxShadow: '0 0 24px rgba(100, 100, 255, 0.7), 10px 0 12px rgba(100, 200, 255, 0.5)',
        }}
      />

      {/* Bottom edge bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: rainbowGradient,
          opacity: 0.9,
          boxShadow: '0 0 24px rgba(100, 100, 255, 0.7), 0 -10px 12px rgba(100, 200, 255, 0.5)',
        }}
      />

      {/* Left edge bar */}
      <div
        className="absolute top-1 left-0 bottom-1 w-1"
        style={{
          background: rainbowGradient,
          opacity: 0.9,
          transform: 'rotate(90deg)',
          transformOrigin: '0 0',
          boxShadow: '0 0 24px rgba(255, 0, 100, 0.7), -10px 0 12px rgba(100, 200, 255, 0.5)',
        }}
      />

      {/* Animated rotating gradient overlay (subtle conic effect) */}
      <div
        className="absolute inset-0"
        style={{
          background: `conic-gradient(
            from var(--rainbow-rotation) at 50% 50%,
            rgba(255, 0, 0, 0.1),
            rgba(255, 100, 0, 0.15),
            rgba(100, 255, 100, 0.15),
            rgba(0, 100, 255, 0.15),
            rgba(255, 0, 0, 0.1)
          )`,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
