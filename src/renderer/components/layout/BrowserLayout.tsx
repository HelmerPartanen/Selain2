import { memo, useEffect } from 'react'
import { FloatingControls } from '@/components/layout/FloatingControls'
import { SettingsPanel } from '@/components/layout/SettingsPanel'
import { WebViewManager } from '@/webview/WebViewManager'
import { useLRUTabManager } from '@/webview/useLRUTabManager'
import { useTabStore } from '@/store/tabStore'
import { useThemeStore } from '@/store/themeStore'

function BrowserLayoutInner(): React.JSX.Element {
  useLRUTabManager()
  const wallpaper = useThemeStore((s) => s.wallpaper)

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
      <div className="fixed top-0 left-0 right-[138px] h-2.5 z-[60] [app-region:drag]" />
      <div className="relative z-10 h-full">
        <WebViewManager />
      </div>
      <FloatingControls />
      <SettingsPanel />
    </div>
  )
}

export const BrowserLayout = memo(BrowserLayoutInner)
