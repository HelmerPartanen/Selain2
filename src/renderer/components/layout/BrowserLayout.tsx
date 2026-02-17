import { memo, useEffect } from 'react'
import { FloatingControls } from '@/components/layout/FloatingControls'
import { SettingsPanel } from '@/components/layout/SettingsPanel'
import { DragZone } from '@/components/layout/DragZone'
import { WebViewManager } from '@/webview/WebViewManager'
import { useLRUTabManager } from '@/webview/useLRUTabManager'
import { useTabStore } from '@/store/tabStore'
import { useThemeStore } from '@/store/themeStore'
import { useTopEdgeReveal } from '@/hooks/useTopEdgeReveal'

function BrowserLayoutInner(): React.JSX.Element {
  useLRUTabManager()
  const wallpaper = useThemeStore((s) => s.wallpaper)
  const { isRevealed, onTriggerEnter, onZoneLeave } = useTopEdgeReveal()

  useEffect(() => {
    const state = useTabStore.getState()
    if (state.tabOrder.length === 0) state.addTab()
  }, [])

  return (
    <div className="relative h-screen overflow-hidden text-gray-900">
      <div
        className={`fixed inset-0 z-0 transition-opacity duration-500 bg-gray-100 ${wallpaper ? 'bg-cover bg-center bg-no-repeat' : ''}`}
        {...(wallpaper && { style: { backgroundImage: `url(${wallpaper})` } })}
      />
      <DragZone visible={isRevealed} onEnter={onTriggerEnter} onLeave={onZoneLeave} />
      <div className="relative z-10 h-full">
        <WebViewManager />
      </div>
      <FloatingControls />
      <SettingsPanel />
    </div>
  )
}

export const BrowserLayout = memo(BrowserLayoutInner)
