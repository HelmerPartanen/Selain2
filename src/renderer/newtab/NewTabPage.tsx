// ─── New Tab Page ────────────────────────────────────────────────────────────
// Shown when a tab navigates to browser://newtab.
// Displays the wallpaper/solid color and a "Customize" button.

import { memo, useCallback } from 'react'
import { Gear } from '@phosphor-icons/react'
import { useThemeStore } from '@/store/themeStore'
import { useTabStore } from '@/store/tabStore'

function NewTabPageInner(): React.JSX.Element {
  const wallpaperType = useThemeStore((s) => s.wallpaperType)
  const wallpaperSource = useThemeStore((s) => s.wallpaperSource)
  const solidColor = useThemeStore((s) => s.solidColor)

  const handleCustomize = useCallback(() => {
    // Navigate the active tab to the settings page
    const { activeTabId, updateTab } = useTabStore.getState()
    if (activeTabId) {
      updateTab(activeTabId, { url: 'browser://settings', title: 'Settings' })
    }
  }, [])

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
    bgStyle = { backgroundColor: '#171717' }
  }

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center select-none"
      style={bgStyle}
    >
      {/* Customize button */}
      <button
        onClick={handleCustomize}
        className="absolute bottom-6 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-full
          bg-neutral-800/80 hover:bg-neutral-700 text-zinc-400 hover:text-zinc-100
          border border-neutral-800 backdrop-blur-sm transition-colors duration-150 text-sm"
      >
        <Gear size={16} weight="regular" />
        Customize
      </button>

      {/* Subtle vignette overlay for image wallpapers */}
      {wallpaperType === 'image' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)'
          }}
        />
      )}
    </div>
  )
}

export const NewTabPage = memo(NewTabPageInner)
