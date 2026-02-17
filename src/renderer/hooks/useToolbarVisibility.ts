import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeScroll } from './scrollSignal'

const IDLE_DELAY = 3000
const SCROLL_HIDE_DELAY = 800
const BOTTOM_PROXIMITY = 120

interface ToolbarVisibility {
  isIdle: boolean
  isScrolling: boolean
  cursorNearBottom: boolean
  shouldHide: boolean
}

export function useToolbarVisibility(isInteracting: boolean): ToolbarVisibility {
  const [isIdle, setIsIdle] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const [cursorNearBottom, setCursorNearBottom] = useState(false)
  const idleTimer = useRef<number>(0)
  const scrollTimer = useRef<number>(0)

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => {
      setIsIdle(true)
      setCursorNearBottom(false)
    }, IDLE_DELAY)
  }, [])

  useEffect(() => {
    if (isInteracting) {
      setIsIdle(false)
      setIsScrolling(false)
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
      return
    }

    const onActivity = (e: MouseEvent | KeyboardEvent): void => {
      setIsIdle(false)
      resetIdle()
      if (e instanceof MouseEvent) {
        setCursorNearBottom(window.innerHeight - e.clientY < BOTTOM_PROXIMITY)
      }
    }

    // Subscribe to webview scroll events via the scrollSignal pub/sub
    const unsubScroll = subscribeScroll((scrolling) => {
      if (scrolling) {
        setIsScrolling(true)
        setIsIdle(false)
        if (scrollTimer.current) clearTimeout(scrollTimer.current)
      } else {
        scrollTimer.current = window.setTimeout(() => setIsScrolling(false), SCROLL_HIDE_DELAY)
      }
    })

    // Also listen to wheel events on the host window (for special pages like newtab)
    const onWheel = (): void => {
      setIsScrolling(true)
      setIsIdle(false)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
      scrollTimer.current = window.setTimeout(() => setIsScrolling(false), SCROLL_HIDE_DELAY)
    }

    window.addEventListener('mousemove', onActivity as EventListener)
    window.addEventListener('keydown', onActivity as EventListener)
    window.addEventListener('wheel', onWheel, { passive: true })
    resetIdle()

    return () => {
      window.removeEventListener('mousemove', onActivity as EventListener)
      window.removeEventListener('keydown', onActivity as EventListener)
      window.removeEventListener('wheel', onWheel)
      unsubScroll()
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
    }
  }, [isInteracting, resetIdle])

  const shouldHide = (isIdle || isScrolling) && !isInteracting && !cursorNearBottom

  return { isIdle, isScrolling, cursorNearBottom, shouldHide }
}
