import { memo, useEffect, useMemo, useRef } from 'react'
import { FloatingControls } from '@/components/layout/FloatingControls'
import { WindowControls } from '@/components/layout/WindowControls'
import { WebViewManager } from '@/webview/WebViewManager'
import { useLRUTabManager } from '@/webview/useLRUTabManager'
import { useTabStore } from '@/store/tabStore'
import { useThemeStore } from '@/store/themeStore'
import { dataUrlToBlobUrl } from '@/store/wallpaperDB'

function BrowserLayoutInner(): React.JSX.Element {
  useLRUTabManager()
  const wallpaper = useThemeStore((s) => s.wallpaper)

  // Convert data URLs to blob URLs for efficient CSS rendering.
  // Blob URLs avoid the rendering engine re-parsing multi-MB base64 strings.
  const blobUrlRef = useRef<string | null>(null)
  const wallpaperUrl = useMemo(() => {
    // Revoke previous blob URL to free memory
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    if (!wallpaper) return null
    // Only convert data: URLs to blob; SVG data URLs are small enough to keep
    if (wallpaper.startsWith('data:image/svg+xml')) return wallpaper
    if (wallpaper.startsWith('data:')) {
      const blobUrl = dataUrlToBlobUrl(wallpaper)
      blobUrlRef.current = blobUrl
      return blobUrl
    }
    return wallpaper
  }, [wallpaper])

  useEffect(() => {
    const state = useTabStore.getState()
    if (state.tabOrder.length === 0) {
      state.addTab()
    }
  }, [])

  return (
  <div className="relative h-screen overflow-hidden text-gray-900">
    {/* Wallpaper layer — fixed behind everything */}
    <div
      className={`
        fixed inset-0 z-0 transition-opacity duration-500
        bg-gray-100
        ${wallpaperUrl ? 'bg-cover bg-center bg-no-repeat' : ''}
      `}
      {...(wallpaperUrl && {
        style: { backgroundImage: `url(${wallpaperUrl})` }
      })}
    />

    {/* Transparent drag region for window movement */}
    <div className="fixed top-0 left-0 right-[138px] h-2.5 z-[60] [app-region:drag]" />

    {/* Web content — fills entire viewport */}
    <div className="relative z-10 h-full">
      <WebViewManager />
    </div>

    {/* Floating controls overlay */}
    <FloatingControls />

    {/* Window controls */}
    <WindowControls />
  </div>
)
}
export const BrowserLayout = memo(BrowserLayoutInner)
