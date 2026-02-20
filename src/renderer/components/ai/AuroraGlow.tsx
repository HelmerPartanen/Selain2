import { useRef } from 'react'
import { motion } from 'motion/react'
import { useRotatingAngle } from './useRotatingAngle'
import { AURORA_GRADIENT } from './constants'

/**
 * Animated conic-gradient border that flows around the panel edge.
 * Only visible (and rotating) while `active` is true.
 */
export function AuroraGlow({ active }: { active: boolean }): React.JSX.Element {
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
