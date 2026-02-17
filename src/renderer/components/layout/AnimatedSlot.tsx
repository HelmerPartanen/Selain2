import React from 'react'
import { useSpring, SPRINGS } from '@/hooks/useSpring'

interface AnimatedSlotProps {
  show: boolean
  width?: number
  children: React.ReactNode
}

export function AnimatedSlot({ show, width = 28, children }: AnimatedSlotProps): React.JSX.Element {
  const w = useSpring(show ? width : 0, SPRINGS.bouncy)
  const opacity = useSpring(show ? 1 : 0, SPRINGS.snappy)
  const scale = useSpring(show ? 1 : 0.4, SPRINGS.bouncy)

  return (
    <div style={{ width: w, overflow: 'hidden', flexShrink: 0 }}>
      <div
        style={{
          width,
          display: 'flex',
          justifyContent: 'center',
          opacity,
          transform: `scale(${scale})`
        }}
      >
        {children}
      </div>
    </div>
  )
}
