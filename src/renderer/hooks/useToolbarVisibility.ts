import { useCallback, useEffect, useRef, useState } from 'react'

const IDLE_DELAY = 3000
const SCROLL_HIDE_DELAY = 800

interface ToolbarVisibility {
  isIdle: boolean
  isScrolling: boolean
  shouldHide: boolean
}

export function useToolbarVisibility(isInteracting: boolean): ToolbarVisibility {
  const [isIdle, setIsIdle] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const idleTimer = useRef<number>(0)
  const scrollTimer = useRef<number>(0)

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIsIdle(true), IDLE_DELAY)
  }, [])

  useEffect(() => {
    if (isInteracting) {
      setIsIdle(false)
      setIsScrolling(false)
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
      return
    }

    const onActivity = (): void => {
      setIsIdle(false)
      resetIdle()
    }

    const onWheel = (): void => {
      setIsScrolling(true)
      setIsIdle(false)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
      scrollTimer.current = window.setTimeout(() => setIsScrolling(false), SCROLL_HIDE_DELAY)
    }

    window.addEventListener('mousemove', onActivity)
    window.addEventListener('keydown', onActivity)
    window.addEventListener('wheel', onWheel, { passive: true })
    resetIdle()

    return () => {
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('wheel', onWheel)
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
    }
  }, [isInteracting, resetIdle])

  return {
    isIdle,
    isScrolling,
    shouldHide: (isIdle || isScrolling) && !isInteracting
  }
}
