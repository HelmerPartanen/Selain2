import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CaretLeft, CaretRight, SplitHorizontal } from '@phosphor-icons/react'
import { useFocusedTabId, useFocusedTabNavState, useIsSplitView } from '@/hooks/useTabSelector'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { URLBar } from '@/components/browser/URLBar'
import { AppMenu } from '@/components/layout/AppMenu'
import { TabPill } from '@/components/browser/TabPill'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/uiStore'
import { useTabStore } from '@/store/tabStore'

const IDLE_DELAY = 2500

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.8 }
const springGentle = { type: 'spring' as const, stiffness: 220, damping: 24, mass: 1.0 }
const springBounce = { type: 'spring' as const, stiffness: 500, damping: 20, mass: 0.6 }

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

    const handleActivity = (): void => {
      // Throttle: skip if called within THROTTLE_MS of last invocation
      const now = performance.now()
      if (now - lastActivityRef.current < THROTTLE_MS) return
      lastActivityRef.current = now

      setIsIdle(false)
      resetTimer()
    }

    window.addEventListener('mousemove', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity)
    resetTimer()

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [isActive, resetTimer])

  return isIdle
}

function FloatingControlsInner(): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const isSettingsOpen = useUIStore((s) => s.isSettingsOpen)
  const isDropdownOpen = useUIStore((s) => s.isDropdownOpen)
  const isMenuOpen = useUIStore((s) => s.isMenuOpen)

  const tabId = useFocusedTabId()
  const { canGoBack, canGoForward } = useFocusedTabNavState()
  const isSplit = useIsSplitView()
  const focusedPanel = useTabStore((s) => s.focusedPanel)

  const isActive = isHovered || isInputFocused || isSettingsOpen || isDropdownOpen || isMenuOpen
  const isIdle = useIdleVisibility(isActive)

  // Close all popups when UI goes idle
  useEffect(() => {
    if (isIdle) {
      const store = useUIStore.getState()
      if (store.isDropdownOpen) store.setDropdownOpen(false)
      if (store.isMenuOpen) store.setMenuOpen(false)
      if (store.isSettingsOpen) store.closeSettings()
    }
  }, [isIdle])

  const handleFocusChange = useCallback((focused: boolean) => {
    setIsInputFocused(focused)
  }, [])

  const handleGoBack = useCallback(() => {
    if (!tabId) return
    webviewRegistry.get(tabId)?.goBack()
  }, [tabId])

  const handleGoForward = useCallback(() => {
    if (!tabId) return
    webviewRegistry.get(tabId)?.goForward()
  }, [tabId])

  const handleUnsplit = useCallback(() => {
    useTabStore.getState().unsplit()
  }, [])

  return (
    <motion.div
      className="fixed bottom-5 left-1/2 z-50 [app-region:no-drag] floating-controls-bar"
      initial={{ x: '-50%', y: 40, scale: 0.85, opacity: 0 }}
      animate={
        isIdle
          ? { x: '-50%', y: 12, scale: 0.94, opacity: 0 }
          : { x: '-50%', y: 0, scale: 1, opacity: 1 }
      }
      whileHover={undefined}
      transition={isIdle ? springGentle : springSnappy}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-1.5">
        {/* Menu Pod */}
        <AppMenu />

        {/* Nav Pod */}
        <AnimatePresence initial={false}>
          {(canGoBack || canGoForward) && (
            <motion.div
              key="nav-pod"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={springBounce}
            >
              <div
                className="flex items-center bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg rounded-full overflow-visible"
              >
                <button
                  onClick={handleGoBack}
                  disabled={!canGoBack}
                  aria-label="Go back"
                  className={`h-10 w-10 flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-100 select-none disabled:opacity-40 disabled:pointer-events-none ${canGoForward ? 'rounded-l-full' : 'rounded-full'}`}
                >
                  <CaretLeft size={16} weight="bold" />
                </button>

                <AnimatePresence initial={false}>
                  {canGoForward && (
                    <motion.div
                      key="forward"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 'auto', opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={springBounce}
                      className="flex items-center"
                      style={{ overflow: 'hidden', flexShrink: 0 }}
                    >
                      <div className="w-px h-5 bg-gray-200 dark:bg-neutral-700 flex-shrink-0" />
                      <button
                        onClick={handleGoForward}
                        aria-label="Go forward"
                        className="h-10 w-10 rounded-r-full flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-100 select-none flex-shrink-0"
                      >
                        <CaretRight size={16} weight="bold" />
                      </button>
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
              initial={{ width: 0, opacity: 0, scale: 0.3 }}
              animate={{ width: 40, opacity: 1, scale: 1 }}
              exit={{ width: 0, opacity: 0, scale: 0.3 }}
              transition={springBounce}
              style={{ overflow: 'hidden', flexShrink: 0 }}
            >
              <div className="rounded-full h-10 flex items-center justify-center px-1 bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg">
                <Button variant="icon" onClick={handleUnsplit} aria-label="Exit split view">
                  <SplitHorizontal size={15} weight="bold" className="text-indigo-500" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Pod */}
        <TabPill />
      </div>

      {/* Split panel indicator dot */}
      <AnimatePresence>
        {isSplit && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex justify-center mt-1.5 gap-1.5"
          >
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-150 ${focusedPanel === 'primary' ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-neutral-600'}`} />
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-150 ${focusedPanel === 'split' ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-neutral-600'}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export const FloatingControls = memo(FloatingControlsInner)
