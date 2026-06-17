import { useCallback, useEffect } from 'react'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { webviewRegistry } from '@/webview/webviewRegistry'

const SWIPE_THRESHOLD = 120
const SWIPE_GESTURE_RESET_MS = 300
let swipeDeltaAccumulator = 0
let swipeTimeoutId = 0
/** True after one action fires for the current continuous swipe; cleared on pause. */
let swipeGestureConsumed = false

function scheduleSwipeGestureReset(): void {
  if (swipeTimeoutId) window.clearTimeout(swipeTimeoutId)
  swipeTimeoutId = window.setTimeout(() => {
    swipeDeltaAccumulator = 0
    swipeGestureConsumed = false
  }, SWIPE_GESTURE_RESET_MS)
}

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

  scheduleSwipeGestureReset()

  // One continuous swipe → at most one tab switch or navigation
  if (swipeGestureConsumed) return

  swipeDeltaAccumulator += deltaX

  if (Math.abs(swipeDeltaAccumulator) < SWIPE_THRESHOLD) return

  const direction = swipeDeltaAccumulator > 0 ? 1 : -1 // + => right swipe, - => left swipe
  swipeGestureConsumed = true
  swipeDeltaAccumulator = 0

  const twoFingerSwipeAction = useSettingsStore.getState().twoFingerSwipeAction
  if (twoFingerSwipeAction === 'navigation') {
    const { activeTabId } = useTabStore.getState()
    if (!activeTabId) return

    const webview = webviewRegistry.get(activeTabId)
    const tab = useTabStore.getState().tabs[activeTabId]

    // Swipe LEFT => back, RIGHT => forward
    if (direction < 0) {
      if (webview && webview.canGoBack()) {
        webview.goBack()
      } else if (tab?.virtualBackUrl) {
        useTabStore.getState().updateTab(activeTabId, {
          url: tab.virtualBackUrl,
          virtualForwardUrl: tab.url,
          virtualBackUrl: null,
          canGoBack: false,
          canGoForward: false,
        })
      }
    } else {
      // forward
      if (tab && tab.url === 'browser://newtab' && tab.virtualForwardUrl) {
        useTabStore.getState().updateTab(activeTabId, {
          url: tab.virtualForwardUrl,
          virtualBackUrl: tab.url,
          virtualForwardUrl: null,
        })
      } else {
        webview?.goForward()
      }
    }
    return
  }

  // Default: switch tabs
  const { tabOrder, activeTabId, setActiveTab } = useTabStore.getState()
  if (!activeTabId || tabOrder.length <= 1) return

  const idx = tabOrder.indexOf(activeTabId)
  const nextIdx = idx + direction
  if (nextIdx >= 0 && nextIdx < tabOrder.length) {
    setActiveTab(tabOrder[nextIdx]!)
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
