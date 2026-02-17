import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useActiveTabId, useActiveTabNavState } from '@/hooks/useTabSelector'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { URLBar } from '@/components/browser/URLBar'
import { AppMenu } from '@/components/layout/AppMenu'
import { TabPill } from '@/components/browser/TabPill'
import { Button } from '@/components/ui/Button'
import { SettingsPanel } from '@/settings/SettingsPanel'
import { useUIStore } from '@/store/uiStore'

const IDLE_DELAY = 2500

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30 }
const springGentle = { type: 'spring' as const, stiffness: 260, damping: 26 }
const springBounce = { type: 'spring' as const, stiffness: 500, damping: 22 }

function useIdleVisibility(isActive: boolean): boolean {
  const [isIdle, setIsIdle] = useState(false)
  const timerRef = useRef<number | null>(null)

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
      setIsIdle(false)
      resetTimer()
    }

    window.addEventListener('mousemove', handleActivity)
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
      className="fixed bottom-5 left-1/2 z-50 [app-region:no-drag]"
      initial={{ x: '-50%', y: 20, scale: 0.92, opacity: 0 }}
      animate={
        isIdle
          ? { x: '-50%', y: 10, scale: 0.96, opacity: 0, filter: 'blur(2px)' }
          : { x: '-50%', y: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }
      }
      whileHover={undefined}
      transition={isIdle ? springGentle : springSnappy}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence>
        {isSettingsOpen && <SettingsPanel />}
      </AnimatePresence>

      <motion.div className="flex items-center gap-1.5" layout transition={springSnappy}>
        {/* Nav Pod */}
        <motion.div
          className="rounded-full h-10 flex items-center px-1 bg-white shadow-lg"
          layout
          transition={springSnappy}
        >
          <AppMenu />

          <AnimatePresence initial={false}>
            {canGoBack && (
              <motion.div
                key="back"
                initial={{ width: 0, opacity: 0, scale: 0.5 }}
                animate={{ width: 28, opacity: 1, scale: 1 }}
                exit={{ width: 0, opacity: 0, scale: 0.5 }}
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
                initial={{ width: 0, opacity: 0, scale: 0.5 }}
                animate={{ width: 28, opacity: 1, scale: 1 }}
                exit={{ width: 0, opacity: 0, scale: 0.5 }}
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
        </motion.div>

        {/* URL Pod */}
        <URLBar onFocusChange={handleFocusChange} />

        {/* Tab Pod */}
        <TabPill />
      </motion.div>
    </motion.div>
  )
}

export const FloatingControls = memo(FloatingControlsInner)
