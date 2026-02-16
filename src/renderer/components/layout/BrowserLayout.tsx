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
  const wallpaperType = useThemeStore((s) => s.wallpaperType)
  const wallpaperSource = useThemeStore((s) => s.wallpaperSource)
  const solidColor = useThemeStore((s) => s.solidColor)

  useEffect(() => {
    const state = useTabStore.getState()
    if (state.tabOrder.length === 0) {
      state.addTab()
    }
  }, [])

  const showTabStrip = tabCount > 1

  // Background style based on wallpaper type
  let bgStyle: React.CSSProperties = {}
  if (wallpaperType === 'image' && wallpaperSource) {
    bgStyle = {
      backgroundImage: `url(${wallpaperSource})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  } else if (wallpaperType === 'solid' && solidColor) {
    bgStyle = { backgroundColor: solidColor }
  } else {
    bgStyle = { backgroundColor: '#1C1C1E' }
  }

  return (
    <div className="relative flex flex-col h-screen text-zinc-100 overflow-hidden bg-[#1C1C1E]">
      {/* Background layer */}
      <div className="absolute inset-0 z-0" style={bgStyle} />
      
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
