import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTabStore } from '@/store/tabStore'
import { TabStrip } from '@/components/browser/TabStrip'
import { URLBar } from '@/components/browser/URLBar'

function FloatingControlsInner(): React.JSX.Element {
  const tabCount = useTabStore((s) => s.tabOrder.length)
  const showTabs = tabCount > 1

  const [isHovered, setIsHovered] = useState(false)
  const [isIdle, setIsIdle] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const idleTimerRef = useRef<number>(0)

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

  return (
    <div
      className="fixed bottom-5 left-1/2 z-50 flex flex-col items-center gap-1.5 [app-region:no-drag]"
      style={{
        transform: `translateX(-50%) translateY(${isIdle ? '8px' : '0px'}) scale(${isIdle ? 0.97 : 1})`,
        opacity: isIdle ? 0.2 : 1,
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tab strip — floating above URL pill */}
      {showTabs && (
        <div
          className="glass rounded-2xl px-1.5 py-1 max-w-[80vw]"
          style={{ boxShadow: 'var(--shadow-float)' }}
        >
          <TabStrip />
        </div>
      )}

      {/* Navigation pill */}
      <URLBar singleTab={!showTabs} onFocusChange={handleFocusChange} />
    </div>
  )
}

export const FloatingControls = memo(FloatingControlsInner)
