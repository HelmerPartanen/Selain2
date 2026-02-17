import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useActiveTabId, useActiveTabNavState } from '@/hooks/useTabSelector'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { URLBar } from '@/components/browser/URLBar'
import { AppMenu } from '@/components/layout/AppMenu'
import { TabPill } from '@/components/browser/TabPill'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/uiStore'

// Lazy-load SettingsPanel — only needed on user interaction
const SettingsPanel = lazy(() => import('@/settings/SettingsPanel').then(m => ({ default: m.SettingsPanel })))

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

  const tabId = useActiveTabId()
  const { canGoBack, canGoForward } = useActiveTabNavState()

  const isActive = isHovered || isInputFocused || isSettingsOpen
  const isIdle = useIdleVisibility(isActive)

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
      <AnimatePresence>
        {isSettingsOpen && (
          <Suspense fallback={null}>
            <SettingsPanel />
          </Suspense>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1.5">
        {/* Nav Pod */}
        <div
          className="rounded-full h-10 flex items-center px-1 bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg"
        >
          <AppMenu />

          <AnimatePresence initial={false}>
            {canGoBack && (
              <motion.div
                key="back"
                initial={{ width: 0, opacity: 0, scale: 0.3, rotate: -45 }}
                animate={{ width: 28, opacity: 1, scale: 1, rotate: 0 }}
                exit={{ width: 0, opacity: 0, scale: 0.3, rotate: 45 }}
                transition={springBounce}
                style={{ overflow: 'hidden', flexShrink: 0 }}
              >
                <div className="w-7 flex justify-center">
                  <Button variant="icon" onClick={handleGoBack} aria-label="Go back">
                    <CaretLeft size={16} weight="bold" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {canGoForward && (
              <motion.div
                key="forward"
                initial={{ width: 0, opacity: 0, scale: 0.3, rotate: 45 }}
                animate={{ width: 28, opacity: 1, scale: 1, rotate: 0 }}
                exit={{ width: 0, opacity: 0, scale: 0.3, rotate: -45 }}
                transition={springBounce}
                style={{ overflow: 'hidden', flexShrink: 0 }}
              >
                <div className="w-7 flex justify-center">
                  <Button variant="icon" onClick={handleGoForward} aria-label="Go forward">
                    <CaretRight size={16} weight="bold" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* URL Pod */}
        <URLBar onFocusChange={handleFocusChange} />

        {/* Tab Pod */}
        <TabPill />
      </div>
    </motion.div>
  )
}

export const FloatingControls = memo(FloatingControlsInner)
