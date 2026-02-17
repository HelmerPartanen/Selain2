import { memo, useCallback, useState } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useActiveTabId, useActiveTabNavState } from '@/hooks/useTabSelector'
import { useSpring, useMultiSpring, SPRINGS } from '@/hooks/useSpring'
import { useToolbarVisibility } from '@/hooks/useToolbarVisibility'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { URLBar } from '@/components/browser/URLBar'
import { AppMenu } from '@/components/layout/AppMenu'
import { TabPill } from '@/components/browser/TabPill'
import { Button } from '@/components/ui/Button'
import { AnimatedSlot } from './AnimatedSlot'

function FloatingControlsInner(): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)

  const tabId = useActiveTabId()
  const { canGoBack, canGoForward } = useActiveTabNavState()

  const isInteracting = isHovered || isInputFocused
  const { shouldHide, isScrolling, isIdle } = useToolbarVisibility(isInteracting)

  // Asymmetric springs: fast snap-in, gentle fade-out
  const spring = useMultiSpring(
    {
      y: shouldHide ? 24 : 0,
      scale: shouldHide ? 0.94 : 1,
      opacity: shouldHide ? (isScrolling ? 0 : isIdle ? 0.2 : 0) : 1,
      blur: shouldHide ? 4 : 0
    },
    shouldHide ? SPRINGS.gentle : SPRINGS.quick
  )

  const handleGoBack = useCallback(() => {
    if (tabId) webviewRegistry.get(tabId)?.goBack()
  }, [tabId])

  const handleGoForward = useCallback(() => {
    if (tabId) webviewRegistry.get(tabId)?.goForward()
  }, [tabId])

  return (
    <div
      className="fixed bottom-5 left-1/2 z-50 [app-region:no-drag]"
      style={{
        transform: `translate(-50%, ${spring.y}px) scale(${spring.scale})`,
        opacity: spring.opacity,
        filter: `blur(${spring.blur}px)`,
        willChange: 'transform, opacity, filter'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-1.5">
        <div className="rounded-full h-10 flex items-center px-1 shadow-lg" style={{ backgroundColor: 'rgba(240, 240, 240, 0.92)', border: '1px solid rgba(0,0,0,0.06)' }}>
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

        <URLBar onFocusChange={(f) => setIsInputFocused(f)} />
        <TabPill />
      </div>
    </div>
  )
}

export const FloatingControls = memo(FloatingControlsInner)
