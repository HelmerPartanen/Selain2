import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useActiveTabId, useActiveTabNavState } from '@/hooks/useTabSelector'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { URLBar } from '@/components/browser/URLBar'
import { AppMenu } from '@/components/layout/AppMenu'
import { TabPill } from '@/components/browser/TabPill'
import { Button } from '@/components/ui/Button'

/* ──────────────────────────────────────────────────────────────── */
/* Constants */
/* ──────────────────────────────────────────────────────────────── */

const SLOT_WIDTH = 28
const IDLE_DELAY = 3000

/* ──────────────────────────────────────────────────────────────── */
/* Animated Slot */
/* ──────────────────────────────────────────────────────────────── */

function AnimatedSlot({
  show,
  children
}: {
  show: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div
      style={{
        width: show ? SLOT_WIDTH : 0,
        overflow: 'hidden',
        flexShrink: 0,
        transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div
        style={{
          width: SLOT_WIDTH,
          display: 'flex',
          justifyContent: 'center',
          opacity: show ? 1 : 0,
          transform: `scale(${show ? 1 : 0.5})`,
          transition: show
            ? 'opacity 300ms ease 80ms, transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1) 50ms'
            : 'opacity 150ms ease, transform 200ms ease'
        }}
      >
        {children}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */
/* Idle Visibility Hook */
/* ──────────────────────────────────────────────────────────────── */

function useIdleVisibility(isActive: boolean): boolean {
  const [isIdle, setIsIdle] = useState(false)
  const timerRef = useRef<number | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)

    timerRef.current = window.setTimeout(() => {
      setIsIdle(true)
    }, IDLE_DELAY)
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

/* ──────────────────────────────────────────────────────────────── */
/* Floating Controls */
/* ──────────────────────────────────────────────────────────────── */

function FloatingControlsInner(): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)

  const tabId = useActiveTabId()
  const { canGoBack, canGoForward } = useActiveTabNavState()

  const isActive = isHovered || isInputFocused
  const isIdle = useIdleVisibility(isActive)

  const containerClasses = useMemo(
    () =>
      `
      fixed bottom-5 left-1/2 z-50 [app-region:no-drag]
      transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
      ${
        isIdle
          ? 'translate-x-[-50%] translate-y-2 scale-95 opacity-15'
          : 'translate-x-[-50%] translate-y-0 scale-100 opacity-100'
      }
    `,
    [isIdle]
  )

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
    <div
      className={containerClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-1.5">
        {/* ── Nav Pod ── */}
        <div
          className="
            rounded-full h-10 flex items-center px-1
            bg-white/70 backdrop-blur-md
            shadow-lg
          "
        >
          <AppMenu />

          <AnimatedSlot show={canGoBack}>
            <Button variant="icon" onClick={handleGoBack} aria-label="Go back">
              <CaretLeft size={16} weight="bold" />
            </Button>
          </AnimatedSlot>

          <AnimatedSlot show={canGoForward}>
            <Button variant="icon" onClick={handleGoForward} aria-label="Go forward">
              <CaretRight size={16} weight="bold" />
            </Button>
          </AnimatedSlot>
        </div>

        {/* ── URL Pod ── */}
        <URLBar onFocusChange={handleFocusChange} />

        {/* ── Tab Pod ── */}
        <TabPill />
      </div>
    </div>
  )
}

export const FloatingControls = memo(FloatingControlsInner)
