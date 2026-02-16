import { memo, useEffect } from 'react'
import { TitleBar } from '@/components/layout/TitleBar'
import { URLBar } from '@/components/browser/URLBar'
import { WebViewManager } from '@/webview/WebViewManager'
import { useLRUTabManager } from '@/webview/useLRUTabManager'
import { useTabStore } from '@/store/tabStore'
import { useThemeStore } from '@/store/themeStore'

function BrowserLayoutInner(): React.JSX.Element {
  useLRUTabManager()
  const tabCount = useTabStore((s) => s.tabOrder.length)
  const wallpaper = useThemeStore((s) => s.wallpaper)

  useEffect(() => {
    const state = useTabStore.getState()
    if (state.tabOrder.length === 0) {
      state.addTab()
    }
  }, [])

  const showTabStrip = tabCount > 1

  return (
    <div className="relative flex flex-col h-screen overflow-hidden" style={{ color: 'var(--text-primary)' }}>
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

      {/* Content layer */}
      <div className="relative z-10 flex flex-col h-full">
        <div className={`flex-shrink-0 transition-all duration-200 ease-out ${showTabStrip ? 'h-[40px]' : 'h-0'}`}>
          <TitleBar visible={showTabStrip} />
        </div>
        <div className="flex flex-col flex-1 min-h-0">
          <URLBar singleTab={!showTabStrip} />
          <WebViewManager />
        </div>
      </div>
    </div>
  )
}

export const BrowserLayout = memo(BrowserLayoutInner)
