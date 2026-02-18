import { useCallback, useEffect, useRef } from 'react'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'

const SWIPE_THRESHOLD = 120

/**
 * Enables horizontal two-finger trackpad swipe to cycle between tabs.
 * Ignored when any panel overlay is open.
 * Mounted once at the app root (BrowserLayout).
 */
export function useTrackpadTabSwipe(): void {
  const swipeDeltaRef = useRef(0)
  const swipeTimeoutRef = useRef<number>(0)

  const handleWheel = useCallback((e: WheelEvent) => {
    // Only respond to horizontal trackpad gestures (deltaX dominant)
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return

    // Skip when any panel or overlay is open
    const ui = useUIStore.getState()
    if (ui.isSettingsOpen || ui.isBookmarksOpen || ui.isHistoryOpen || ui.isDownloadsOpen) return

    swipeDeltaRef.current += e.deltaX

    // Reset accumulator if the user pauses swiping
    if (swipeTimeoutRef.current) window.clearTimeout(swipeTimeoutRef.current)
    swipeTimeoutRef.current = window.setTimeout(() => {
      swipeDeltaRef.current = 0
    }, 300)

    if (Math.abs(swipeDeltaRef.current) >= SWIPE_THRESHOLD) {
      const { tabOrder, activeTabId, setActiveTab } = useTabStore.getState()
      if (!activeTabId || tabOrder.length <= 1) {
        swipeDeltaRef.current = 0
        return
      }
      const idx = tabOrder.indexOf(activeTabId)
      const direction = swipeDeltaRef.current > 0 ? 1 : -1
      const nextIdx = idx + direction
      if (nextIdx >= 0 && nextIdx < tabOrder.length) {
        setActiveTab(tabOrder[nextIdx]!)
      }
      swipeDeltaRef.current = 0
    }
  }, [])

  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [handleWheel])
}
