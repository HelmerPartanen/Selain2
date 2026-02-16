import { memo, useEffect } from 'react'
import { FloatingControls } from '@/components/layout/FloatingControls'
import { WebViewManager } from '@/webview/WebViewManager'
import { useLRUTabManager } from '@/webview/useLRUTabManager'
import { useTabStore } from '@/store/tabStore'
import { useThemeStore } from '@/store/themeStore'

function BrowserLayoutInner(): React.JSX.Element {
  useLRUTabManager()
  const wallpaper = useThemeStore((s) => s.wallpaper)

  useEffect(() => {
    const state = useTabStore.getState()
    if (state.tabOrder.length === 0) {
      state.addTab()
    }
  }, [])

  return (
    <div className="relative h-screen overflow-hidden" style={{ color: 'var(--text-primary)' }}>
      {/* Wallpaper layer — fixed behind everything */}
      <div
        className="fixed inset-0 z-0 transition-opacity duration-500"
        style={{
          backgroundColor: 'var(--bg-solid-fallback)',
          backgroundImage: wallpaper ? `url(${wallpaper})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Transparent drag region for window movement */}
      <div className="fixed top-0 left-0 right-[138px] h-2.5 z-[60] [app-region:drag]" />

      {/* Web content — fills entire viewport */}
      <div className="relative z-10 h-full">
        <WebViewManager />
      </div>

      {/* Floating controls overlay */}
      <FloatingControls />
    </div>
  )
}

export const BrowserLayout = memo(BrowserLayoutInner)
