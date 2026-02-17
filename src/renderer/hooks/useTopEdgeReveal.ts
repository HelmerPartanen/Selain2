import { useCallback, useRef, useState } from 'react'

const HIDE_DELAY = 400

export function useTopEdgeReveal(): {
  isRevealed: boolean
  onTriggerEnter: () => void
  onZoneLeave: () => void
} {
  const [isRevealed, setIsRevealed] = useState(false)
  const hideTimer = useRef<number>(0)

  const onTriggerEnter = useCallback(() => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = 0 }
    setIsRevealed(true)
  }, [])

  const onZoneLeave = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setIsRevealed(false), HIDE_DELAY)
  }, [])

  return { isRevealed, onTriggerEnter, onZoneLeave }
}
