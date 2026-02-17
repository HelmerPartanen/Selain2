import { memo, useEffect, useMemo, useRef } from 'react'
import { FloatingControls } from '@/components/layout/FloatingControls'
import { WindowControls } from '@/components/layout/WindowControls'
import { WebViewManager } from '@/webview/WebViewManager'
import { useLRUTabManager } from '@/webview/useLRUTabManager'
import { useTabStore } from '@/store/tabStore'
import { useThemeStore } from '@/store/themeStore'
import { useUIStore } from '@/store/uiStore'
import { dataUrlToBlobUrl } from '@/store/wallpaperDB'

function BrowserLayoutInner(): React.JSX.Element {
  useLRUTabManager()
  const wallpaper = useThemeStore((s) => s.wallpaper)
  const isDropdownOpen = useUIStore((s) => s.isDropdownOpen)
  const isMenuOpen = useUIStore((s) => s.isMenuOpen)
  const closeDropdown = useUIStore((s) => s.setDropdownOpen)
  const closeMenu = useUIStore((s) => s.setMenuOpen)

  // Convert data URLs to blob URLs for efficient CSS rendering.
  // Blob URLs avoid the rendering engine re-parsing multi-MB base64 strings.
  // NOTE: Revocation is deferred to useEffect (after commit) so the DOM
  // never references a revoked blob URL during the render-to-commit gap.
  const prevBlobRef = useRef<string | null>(null)
  const wallpaperUrl = useMemo(() => {
    if (!wallpaper) return null
    if (wallpaper.startsWith('data:image/svg+xml')) return wallpaper
    if (wallpaper.startsWith('blob:')) return wallpaper
    if (wallpaper.startsWith('data:')) return dataUrlToBlobUrl(wallpaper)
    return wallpaper
  }, [wallpaper])

  // Revoke the previous blob URL after React has committed the new one to the DOM
  useEffect(() => {
    const prev = prevBlobRef.current
    // Only revoke if it's a blob URL we created (not one from the store)
    if (prev && prev !== wallpaperUrl) {
      URL.revokeObjectURL(prev)
    }
    // Track the current blob URL for future cleanup
    prevBlobRef.current =
      wallpaperUrl && wallpaperUrl.startsWith('blob:') && !wallpaper?.startsWith('blob:')
        ? wallpaperUrl
        : null

    return () => {
      // On unmount, revoke any outstanding blob URL
      if (prevBlobRef.current) {
        URL.revokeObjectURL(prevBlobRef.current)
        prevBlobRef.current = null
      }
    }
  }, [wallpaperUrl, wallpaper])

  useEffect(() => {
    const state = useTabStore.getState()
    if (state.tabOrder.length === 0) {
      state.addTab()
    }
  }, [])

  return (
  <div className="relative h-screen overflow-hidden text-gray-900 dark:text-gray-100">
    {/* Wallpaper layer — fixed behind everything */}
    <div
      className={`
        fixed inset-0 z-0 transition-opacity duration-500
        bg-gray-100 dark:bg-neutral-900
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

    {/* Click-away overlay for dropdowns (rendered above webview stacking context) */}
    {(isDropdownOpen || isMenuOpen) && (
      <div
        className="fixed inset-0 z-[45]"
        onMouseDown={() => {
          closeDropdown(false)
          closeMenu(false)
        }}
      />
    )}

    {/* Window controls */}
    <WindowControls />
  </div>
)
}
export const BrowserLayout = memo(BrowserLayoutInner)
