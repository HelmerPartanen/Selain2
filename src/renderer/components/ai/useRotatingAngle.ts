import { useRef } from 'react'
import { useAnimationFrame } from 'motion/react'

/**
 * Drives a `--aurora-angle` CSS custom property on the given element,
 * rotating it at `rpm` revolutions per minute via rAF for smooth motion.
 */
export function useRotatingAngle(
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
