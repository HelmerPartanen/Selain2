import { useCallback, useEffect, useRef } from 'react'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'

const SWIPE_THRESHOLD = 120
let swipeDeltaAccumulator = 0
let swipeTimeoutId = 0

export function handleTabSwipeDelta(deltaX: number, deltaY = 0, ctrlKey = false): void {
  // Overriden by pinch gesture? (trackpad pinch natively triggers wheel with ctrlKey)
  if (ctrlKey) {
    // Only responding to "pinch-in" (zooming out), which registers as positive deltaY
    if (deltaY > 20) {
      const ui = useUIStore.getState()
      if (!ui.isTabOverviewOpen) {
        ui.toggleTabOverview()
      }
    }
    return
  }

  // Only respond to horizontal trackpad gestures (deltaX dominant)
  if (Math.abs(deltaX) <= Math.abs(deltaY)) return

  // Skip when any panel or overlay is open
  const ui = useUIStore.getState()
  if (ui.isSettingsOpen || ui.isBookmarksOpen || ui.isHistoryOpen || ui.isDownloadsOpen) return

  swipeDeltaAccumulator += deltaX

  // Reset accumulator if the user pauses swiping
  if (swipeTimeoutId) window.clearTimeout(swipeTimeoutId)
  swipeTimeoutId = window.setTimeout(() => {
    swipeDeltaAccumulator = 0
  }, 300)

  if (Math.abs(swipeDeltaAccumulator) >= SWIPE_THRESHOLD) {
    const { tabOrder, activeTabId, setActiveTab } = useTabStore.getState()
    if (!activeTabId || tabOrder.length <= 1) {
      swipeDeltaAccumulator = 0
      return
    }
    const idx = tabOrder.indexOf(activeTabId)
    const direction = swipeDeltaAccumulator > 0 ? 1 : -1
    const nextIdx = idx + direction
    if (nextIdx >= 0 && nextIdx < tabOrder.length) {
      setActiveTab(tabOrder[nextIdx]!)
    }
    swipeDeltaAccumulator = 0
  }
}

/**
 * Enables horizontal two-finger trackpad swipe to cycle between tabs.
 * Ignored when any panel overlay is open.
 * Mounted once at the app root (BrowserLayout).
 */
export function useTrackpadTabSwipe(): void {
  const handleWheel = useCallback((e: WheelEvent) => {
    handleTabSwipeDelta(e.deltaX, e.deltaY, e.ctrlKey)
  }, [])

  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [handleWheel])
}
