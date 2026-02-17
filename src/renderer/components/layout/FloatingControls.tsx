import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useFocusedTabId, useFocusedTabNavState, useIsSplitView } from '@/hooks/useTabSelector'
import { SvgIcon } from '@/components/ui/SvgIcon'
import chevronLeftSvg from '@/assets/icons/Arrows/Chevron_Left.svg?raw'
import chevronRightSvg from '@/assets/icons/Arrows/Chevron_Right.svg?raw'
import unsplitSvg from '@/assets/icons/Arrows/Left_Line_Right_Inside_Fill.svg?raw'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { URLBar } from '@/components/browser/URLBar'
import { AppMenu } from '@/components/layout/AppMenu'
import { TabPill } from '@/components/browser/TabPill'
import { DownloadPill } from '@/components/browser/DownloadPill'
import { useUIStore } from '@/store/uiStore'
import { useTabStore } from '@/store/tabStore'

const IDLE_DELAY = 2500

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.8 }
const springGentle = { type: 'spring' as const, stiffness: 220, damping: 24, mass: 1.0 }
const springExpand = { type: 'spring' as const, stiffness: 340, damping: 32, mass: 0.9 }

const THROTTLE_MS = 100

function useIdleVisibility(isActive: boolean): boolean {
  const [isIdle, setIsIdle] = useState(false)
  const timerRef = useRef<number | null>(null)
  const lastActivityRef = useRef<number>(0)

  const resetTimer = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setIsIdle(true), IDLE_DELAY)
  }, [])

  useEffect(() => {
    if (isActive) {
      setIsIdle(false)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      return
    }

    // Only keyboard activity keeps the bar visible; mouse reveal is handled
    // exclusively by hovering the bottom-edge zone or the bar itself.
    const handleKeyActivity = (): void => {
      const now = performance.now()
      if (now - lastActivityRef.current < THROTTLE_MS) return
      lastActivityRef.current = now

      setIsIdle(false)
      resetTimer()
    }

    window.addEventListener('keydown', handleKeyActivity)
    resetTimer()

    return () => {
      window.removeEventListener('keydown', handleKeyActivity)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [isActive, resetTimer])

  return isIdle
}

function FloatingControlsInner(): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const isSettingsOpen = useUIStore((s) => s.isSettingsOpen)
  const isBookmarksOpen = useUIStore((s) => s.isBookmarksOpen)
  const isHistoryOpen = useUIStore((s) => s.isHistoryOpen)
  const isDownloadsOpen = useUIStore((s) => s.isDownloadsOpen)
  const isTabOverviewOpen = useUIStore((s) => s.isTabOverviewOpen)
  const isDropdownOpen = useUIStore((s) => s.isDropdownOpen)
  const isMenuOpen = useUIStore((s) => s.isMenuOpen)

  const tabId = useFocusedTabId()
  const { canGoBack, canGoForward } = useFocusedTabNavState()
  const isSplit = useIsSplitView()
  const focusedPanel = useTabStore((s) => s.focusedPanel)

  const isActive = isHovered || isInputFocused || isSettingsOpen || isBookmarksOpen || isHistoryOpen || isDownloadsOpen || isTabOverviewOpen || isDropdownOpen || isMenuOpen
  const isIdle = useIdleVisibility(isActive)

  // Close transient popups when UI goes idle (but NOT full panels like settings/bookmarks/history/downloads)
  useEffect(() => {
    if (isIdle) {
      const store = useUIStore.getState()
      if (store.isDropdownOpen) store.setDropdownOpen(false)
      if (store.isMenuOpen) store.setMenuOpen(false)
    }
  }, [isIdle])

  const handleFocusChange = useCallback((focused: boolean) => {
    setIsInputFocused(focused)
  }, [])

  const handleGoBack = useCallback(() => {
    if (!tabId) return
    const webview = webviewRegistry.get(tabId)
    if (webview && webview.canGoBack()) {
      webview.goBack()
    } else {
      // Fall back to virtual history (e.g. back to browser://newtab)
      const tab = useTabStore.getState().tabs[tabId]
      if (tab?.virtualBackUrl) {
        useTabStore.getState().updateTab(tabId, {
          url: tab.virtualBackUrl,
          virtualForwardUrl: tab.url,
          virtualBackUrl: null,
          canGoBack: false,
          canGoForward: false
        })
      }
    }
  }, [tabId])

  const handleGoForward = useCallback(() => {
    if (!tabId) return
    const tab = useTabStore.getState().tabs[tabId]
    // If on a special page with a virtual forward URL, navigate there
    if (tab && tab.url === 'browser://newtab' && tab.virtualForwardUrl) {
      useTabStore.getState().updateTab(tabId, {
        url: tab.virtualForwardUrl,
        virtualBackUrl: tab.url,
        virtualForwardUrl: null
      })
    } else {
      webviewRegistry.get(tabId)?.goForward()
    }
  }, [tabId])

  const handleUnsplit = useCallback(() => {
    useTabStore.getState().unsplit()
  }, [])

  return (
    <>
    {/* Bottom-edge hover zone to reveal floating UI */}
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-8 z-[49] [app-region:no-drag] bg-red-500/25"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
    <motion.div
      className="fixed bottom-5 left-1/2 z-50 [app-region:no-drag] floating-controls-bar"
      initial={{ x: '-50%', y: 40, scale: 0.85, opacity: 0 }}
      animate={
        isIdle
          ? { x: '-50%', y: 12, scale: 0.94, opacity: 0 }
          : { x: '-50%', y: 0, scale: 1, opacity: 1 }
      }
      transition={isIdle ? springGentle : springSnappy}
    >
      <div className="flex items-center gap-1.5">
        {/* Menu Pod */}
        <AppMenu />

        {/* Nav Pod */}
        <AnimatePresence initial={false}>
          {(canGoBack || canGoForward) && (
            <motion.div
              key="nav-pod"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ ...springExpand, opacity: { duration: 0.15 } }}
              className="flex-shrink-0"
            >
              <div
                className="flex items-center bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg rounded-full"
              >
                <motion.button
                  onClick={handleGoBack}
                  disabled={!canGoBack}
                  aria-label="Go back"
                  whileTap={{ scale: 0.82, x: -2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15, mass: 0.6 }}
                  className={`h-10 w-10 flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-[background-color,opacity] duration-150 select-none disabled:opacity-40 disabled:pointer-events-none ${canGoForward ? 'rounded-l-full' : 'rounded-full'}`}
                >
                  <SvgIcon svg={chevronLeftSvg} size={16} />
                </motion.button>

                <AnimatePresence initial={false}>
                  {canGoForward && (
                    <motion.div
                      key="forward"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ ...springExpand, opacity: { duration: 0.12 } }}
                      className="flex items-center overflow-hidden"
                      style={{ flexShrink: 0 }}
                    >
                      <div className="w-px h-5 bg-gray-200 dark:bg-neutral-700 flex-shrink-0" />
                      <motion.button
                        onClick={handleGoForward}
                        aria-label="Go forward"
                        whileTap={{ scale: 0.82, x: 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15, mass: 0.6 }}
                        className="h-10 w-10 rounded-r-full flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-[background-color] duration-150 select-none flex-shrink-0"
                      >
                        <SvgIcon svg={chevronRightSvg} size={16} />
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* URL Pod */}
        <URLBar onFocusChange={handleFocusChange} />

        {/* Split indicator */}
        <AnimatePresence initial={false}>
          {isSplit && (
            <motion.div
              key="unsplit-slot"
              initial={{ width: 0, marginLeft: 0 }}
              animate={{ width: 40, marginLeft: 0 }}
              exit={{ width: 0, marginLeft: -6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.8 }}
              style={{ flexShrink: 0, clipPath: 'inset(-12px -12px -12px -12px)' }}
            >
              <motion.button
                onClick={handleUnsplit}
                aria-label="Exit split view"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{
                  type: 'spring', stiffness: 400, damping: 22, mass: 0.6,
                  opacity: { duration: 0.15 }
                }}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg text-indigo-500 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-[background-color] duration-100 select-none"
              >
                <SvgIcon svg={unsplitSvg} size={15} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Download Pill */}
        <DownloadPill />

        {/* Tab Pod */}
        <TabPill />
      </div>

      {/* Split panel indicator dots */}
      <AnimatePresence>
        {isSplit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: isSplit ? 0.12 : 0 }}
            className="absolute left-1/2 -translate-x-1/2 flex gap-2"
            style={{ top: '100%', marginTop: 6 }}
          >
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${focusedPanel === 'primary' ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-neutral-600'}`} />
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${focusedPanel === 'split' ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-neutral-600'}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </>
  )
}

export const FloatingControls = memo(FloatingControlsInner)
