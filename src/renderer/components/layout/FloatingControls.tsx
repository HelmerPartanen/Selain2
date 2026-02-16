import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useActiveTabId, useActiveTabNavState } from '@/hooks/useTabSelector'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { URLBar } from '@/components/browser/URLBar'
import { AppMenu } from '@/components/layout/AppMenu'
import { TabPill } from '@/components/browser/TabPill'
import { Button } from '@/components/ui/Button'

/* ── AnimatedSlot: spring-animates a child's width in/out ────────────────── */

const SLOT_WIDTH = 28

function AnimatedSlot({ show, children }: { show: boolean; children: React.ReactNode }): React.JSX.Element {
  return (
    <div
      style={{
        width: show ? SLOT_WIDTH : 0,
        overflow: 'hidden',
        flexShrink: 0,
        transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div
        style={{
          opacity: show ? 1 : 0,
          transform: `scale(${show ? 1 : 0.5})`,
          transition: show
            ? 'opacity 0.3s ease 0.08s, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s'
            : 'opacity 0.15s ease, transform 0.2s ease',
          width: SLOT_WIDTH,
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        {children}
      </div>
    </div>
  )
}

/* ── FloatingControls: three-pod bottom bar ──────────────────────────────── */

function FloatingControlsInner(): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false)
  const [isIdle, setIsIdle] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const idleTimerRef = useRef<number>(0)

  const tabId = useActiveTabId()
  const { canGoBack, canGoForward } = useActiveTabNavState()

  const isActive = isHovered || isInputFocused

  useEffect(() => {
    if (isActive) {
      setIsIdle(false)
      clearTimeout(idleTimerRef.current)
      return
    }

    const startIdleTimer = (): void => {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = window.setTimeout(() => setIsIdle(true), 3000)
    }

    const handleActivity = (): void => {
      setIsIdle(false)
      startIdleTimer()
    }

    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    startIdleTimer()

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      clearTimeout(idleTimerRef.current)
    }
  }, [isActive])

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
      className="fixed bottom-5 left-1/2 z-50 [app-region:no-drag]"
      style={{
        transform: `translateX(-50%) translateY(${isIdle ? '8px' : '0px'}) scale(${isIdle ? 0.97 : 1})`,
        opacity: isIdle ? 0.15 : 1,
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-1.5">
        {/* ── Nav Pod ── menu + animated back / forward */}
        <div
          className="glass rounded-full h-10 flex items-center px-1"
          style={{ boxShadow: 'var(--shadow-float)' }}
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
