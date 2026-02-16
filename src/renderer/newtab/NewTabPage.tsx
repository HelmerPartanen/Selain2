// ─── New Tab Page ────────────────────────────────────────────────────────────
// Shown when a tab navigates to browser://newtab.
// Displays the wallpaper/solid color and a "Customize" button.

import { memo, useCallback, useEffect, useState } from 'react'
import { Gear } from '@phosphor-icons/react'
import { useThemeStore } from '@/store/themeStore'
import { useTabStore } from '@/store/tabStore'

function NewTabPageInner(): React.JSX.Element {
  const wallpaperType = useThemeStore((s) => s.wallpaperType)
  const wallpaperSource = useThemeStore((s) => s.wallpaperSource)
  const solidColor = useThemeStore((s) => s.solidColor)

  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

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
    bgStyle = { backgroundColor: 'var(--color-surface)' }
  }

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center select-none"
      style={bgStyle}
    >
      {/* Center greeting */}
      <div className="z-10 flex flex-col items-center gap-3">
        <h1
          className="text-5xl font-light tracking-tight"
          style={{
            color: wallpaperType === 'image'
              ? 'rgba(255,255,255,0.9)'
              : 'var(--color-text)'
          }}
        >
          {greeting}
        </h1>
        <TimeDisplay isImage={wallpaperType === 'image'} />
      </div>

      {/* Customize button */}
      <button
        onClick={handleCustomize}
        className="absolute bottom-6 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-lg
          bg-surface-raised/80 hover:bg-surface-hover text-text-muted hover:text-text
          border border-border backdrop-blur-sm transition-colors duration-150 text-sm"
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

/** Live clock display */
function TimeDisplay({ isImage }: { isImage: boolean }): React.JSX.Element {
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    const update = (): void => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <p
      className="text-lg font-light tracking-wide"
      style={{
        color: isImage ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)'
      }}
    >
      {time}
    </p>
  )
}

export const NewTabPage = memo(NewTabPageInner)
