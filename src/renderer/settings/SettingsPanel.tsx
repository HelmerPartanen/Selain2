import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import sunSvg from '@/assets/icons/Weather/Sun_1.svg?raw'
import moonSvg from '@/assets/icons/Weather/Moon.svg?raw'
import displaySvg from '@/assets/icons/Devices/Display.svg?raw'
import checkSvg from '@/assets/icons/Interface/Check.svg?raw'
import uploadSvg from '@/assets/icons/Objects/Tray_Arrow_Up.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import brushSvg from '@/assets/icons/Objects/Brush.svg?raw'
import cameraSvg from '@/assets/icons/Objects/Camera_Rctangle.svg?raw'
import infoSvg from '@/assets/icons/Interface/Warn_Info.svg?raw'
import settingsSvg from '@/assets/icons/Objects/Settings.svg?raw'
import shieldSvg from '@/assets/icons/Objects/Shield.svg?raw'
import searchSvg from '@/assets/icons/Objects/Search.svg?raw'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import { useUIStore } from '@/store/uiStore'
import { useSearchEngineStore, SEARCH_ENGINES } from '@/store/searchEngineStore'
import { useSettingsStore, UI_ZOOM_OPTIONS, type NewTabMode } from '@/store/settingsStore'
import { useHistoryStore } from '@/store/historyStore'
import { useDownloadStore } from '@/store/downloadStore'
import { useBookmarkStore } from '@/store/bookmarkStore'
import { WALLPAPER_PRESETS, SOLID_COLOR_PRESETS } from '@/theme/presets'
import { BUNDLED_WALLPAPERS, generateThumbnail } from '@/theme/bundledWallpapers'

// --- Constants ----------------------------------------------------------------

const springPanel = { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.8 }

const gradientBaseStyles: React.CSSProperties[] = WALLPAPER_PRESETS.map((preset) => ({
  backgroundImage: `url(${preset.dataUrl})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}))

const solidBaseColors: string[] = SOLID_COLOR_PRESETS.map((c) => c.hex)

function solidToDataUrl(hex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${hex}"/></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

const SOLID_DATA_URL_MAP = new Map<string, string>(
  SOLID_COLOR_PRESETS.map((c) => [c.hex, solidToDataUrl(c.hex)])
)

const THEME_MODES: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Light', icon: sunSvg },
  { mode: 'dark', label: 'Dark', icon: moonSvg },
  { mode: 'system', label: 'System', icon: displaySvg }
]

// --- Sidebar Categories -------------------------------------------------------

type SettingsCategory = 'general' | 'appearance' | 'wallpaper' | 'privacy' | 'search' | 'about'

interface CategoryItem {
  id: SettingsCategory
  label: string
  icon: string
}

const CATEGORIES: CategoryItem[] = [
  { id: 'general', label: 'General', icon: settingsSvg },
  { id: 'appearance', label: 'Appearance', icon: brushSvg },
  { id: 'wallpaper', label: 'Wallpaper', icon: cameraSvg },
  { id: 'privacy', label: 'Privacy', icon: shieldSvg },
  { id: 'search', label: 'Search Engine', icon: searchSvg },
  { id: 'about', label: 'About', icon: infoSvg }
]

// --- Shared Components --------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="text-[11px] font-semibold tracking-wide uppercase text-gray-400 dark:text-neutral-500">
      {children}
    </span>
  )
}

function Desc({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="text-[12px] text-gray-500 dark:text-neutral-400 mb-4">{children}</p>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): React.JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-[42px] h-[24px] rounded-full flex-shrink-0 transition-colors duration-200 ${
        checked
          ? 'bg-indigo-500 dark:bg-indigo-400'
          : 'bg-gray-300 dark:bg-neutral-600'
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-gray-800 dark:text-neutral-200">{label}</div>
        {desc && <div className="text-[11px] text-gray-400 dark:text-neutral-500 mt-0.5">{desc}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

// --- General Pane -------------------------------------------------------------

function GeneralPane(): React.JSX.Element {
  const restoreTabs = useSettingsStore((s) => s.restoreTabs)
  const setRestoreTabs = useSettingsStore((s) => s.setRestoreTabs)
  const newTabMode = useSettingsStore((s) => s.newTabMode)
  const setNewTabMode = useSettingsStore((s) => s.setNewTabMode)
  const homepageUrl = useSettingsStore((s) => s.homepageUrl)
  const setHomepageUrl = useSettingsStore((s) => s.setHomepageUrl)
  const [urlDraft, setUrlDraft] = useState(homepageUrl)

  const handleUrlBlur = useCallback(() => {
    const trimmed = urlDraft.trim()
    setHomepageUrl(trimmed)
  }, [urlDraft, setHomepageUrl])

  const handleUrlKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">Startup</h3>
        <Desc>Control what happens when the browser opens.</Desc>
        <div className="space-y-1">
          <SettingRow label="Restore previous tabs" desc="Reopen tabs from your last session on startup">
            <Toggle checked={restoreTabs} onChange={setRestoreTabs} />
          </SettingRow>
        </div>
      </div>

      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">New Tab</h3>
        <Desc>Choose what appears when you open a new tab.</Desc>
        <div className="flex gap-2">
          {(['bookmarks', 'blank'] as NewTabMode[]).map((mode) => {
            const isActive = newTabMode === mode
            return (
              <button
                key={mode}
                onClick={() => setNewTabMode(mode)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm'
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-700'
                }`}
              >
                {mode === 'bookmarks' ? 'Bookmarks' : 'Blank Page'}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">Homepage</h3>
        <Desc>URL to navigate when clicking the home button. Leave empty to disable.</Desc>
        <input
          type="text"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={handleUrlBlur}
          onKeyDown={handleUrlKey}
          placeholder="https://example.com"
          spellCheck={false}
          className="w-full px-3 py-2 rounded-xl text-[12px] bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-500 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors duration-150"
        />
      </div>
    </div>
  )
}

// --- Appearance Pane ----------------------------------------------------------

function AppearancePane(): React.JSX.Element {
  const themeMode = useThemeStore((s) => s.themeMode)
  const setThemeMode = useThemeStore((s) => s.setThemeMode)
  const uiZoom = useSettingsStore((s) => s.uiZoom)
  const setUiZoom = useSettingsStore((s) => s.setUiZoom)
  const autoHideDelay = useSettingsStore((s) => s.autoHideDelay)
  const setAutoHideDelay = useSettingsStore((s) => s.setAutoHideDelay)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">Theme</h3>
        <Desc>Choose how the browser interface looks.</Desc>
        <div className="flex gap-3">
          {THEME_MODES.map(({ mode, label, icon }) => {
            const isActive = themeMode === mode
            return (
              <button
                key={mode}
                onClick={() => setThemeMode(mode)}
                className={`flex-1 flex flex-col items-center gap-2.5 p-4 border rounded-2xl transition-all duration-150 ${
                  isActive
                    ? 'bg-neutral-100 dark:bg-neutral-800 border-transparent text-indigo-500 dark:text-indigo-400 shadow-lg outline outline-2 outline-indigo-500 dark:outline-indigo-400'
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                <SvgIcon svg={icon} size={22} />
                <span className="text-[12px] font-semibold">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">Interface Scale</h3>
        <Desc>Scale the browser UI. Does not affect web page content.</Desc>
        <div className="flex gap-1.5">
          {UI_ZOOM_OPTIONS.map((z) => {
            const isActive = uiZoom === z
            return (
              <button
                key={z}
                onClick={() => setUiZoom(z)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm'
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
                }`}
              >
                {z}%
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">Toolbar Auto-Hide</h3>
        <Desc>How long the floating toolbar stays visible after inactivity.</Desc>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1000}
            max={5000}
            step={250}
            value={autoHideDelay}
            onChange={(e) => setAutoHideDelay(parseInt(e.target.value))}
            className="flex-1 h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-neutral-700 accent-indigo-500 dark:accent-indigo-400 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 dark:[&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:shadow-sm"
          />
          <span className="text-[12px] font-mono font-medium text-gray-500 dark:text-neutral-400 w-10 text-right tabular-nums">
            {(autoHideDelay / 1000).toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  )
}

// --- Lazy Wallpaper Thumbnail -------------------------------------------------

function LazyWallpaperThumb({
  url,
  storageKey,
  isActive,
  onSelect
}: {
  url: string
  storageKey: string
  isActive: boolean
  onSelect: (key: string) => void
}): React.JSX.Element {
  const ref = useRef<HTMLButtonElement>(null)
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const observedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || observedRef.current) return
    observedRef.current = true

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          observer.disconnect()
          generateThumbnail(url).then(setThumbUrl)
        }
      },
      { rootMargin: '100px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [url])

  return (
    <button
      ref={ref}
      onClick={() => onSelect(storageKey)}
      className={`relative flex-shrink-0 w-[140px] aspect-[16/10] rounded-xl overflow-hidden transition-all duration-150 ${
        isActive
          ? 'outline outline-[3px] outline-indigo-500 dark:outline-indigo-400'
          : 'outline-none hover:ring-2 hover:ring-gray-300 dark:hover:ring-neutral-600'
      }`}
      style={{
        backgroundImage: thumbUrl ? `url(${thumbUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: thumbUrl ? undefined : 'rgb(38 38 38)',
      }}
    />
  )
}

// --- Wallpaper Pane -----------------------------------------------------------

const WallpaperPane = memo(function WallpaperPane(): React.JSX.Element {
  const wallpaper = useThemeStore((s) => s.wallpaper)
  const setWallpaper = useThemeStore((s) => s.setWallpaper)

  const handleSelectPreset = useCallback(
    (dataUrl: string) => setWallpaper(dataUrl),
    [setWallpaper]
  )

  const handleSelectSolid = useCallback(
    (hex: string) => setWallpaper(solidToDataUrl(hex)),
    [setWallpaper]
  )

  const handleCustomImage = useCallback(async () => {
    try {
      const dataUrl = await window.electronAPI.openImageDialog()
      if (dataUrl) setWallpaper(dataUrl)
    } catch (err) {
      console.error('Failed to open image dialog:', err)
    }
  }, [setWallpaper])

  const handleClear = useCallback(() => setWallpaper(null), [setWallpaper])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <SectionLabel>Wallpapers</SectionLabel>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
          {BUNDLED_WALLPAPERS.map((wp) => (
            <LazyWallpaperThumb
              key={wp.filename}
              url={wp.url}
              storageKey={wp.storageKey}
              isActive={wallpaper === wp.storageKey}
              onSelect={handleSelectPreset}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <SectionLabel>Gradients</SectionLabel>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
          {WALLPAPER_PRESETS.map((preset, i) => {
            const isActive = wallpaper === preset.dataUrl
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.dataUrl)}
                title={preset.name}
                className={`relative flex-shrink-0 w-[140px] aspect-[16/10] rounded-xl overflow-hidden transition-all duration-150 ${
                  isActive
                    ? 'outline outline-[3px] outline-indigo-500 dark:outline-indigo-400'
                    : 'outline-none hover:ring-2 hover:ring-gray-300 dark:hover:ring-neutral-600'
                }`}
                style={gradientBaseStyles[i]}
              />
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <SectionLabel>Solid Colors</SectionLabel>
        </div>
        <div className="grid grid-cols-10 gap-2">
          {SOLID_COLOR_PRESETS.map((color, i) => {
            const isActive = wallpaper === SOLID_DATA_URL_MAP.get(color.hex)
            return (
              <button
                key={color.hex}
                onClick={() => handleSelectSolid(color.hex)}
                title={color.name}
                className={`relative aspect-square rounded-full overflow-hidden transition-all duration-150 ${
                  isActive
                    ? 'outline outline-[3px] outline-indigo-500 dark:outline-indigo-400'
                    : 'outline-none hover:ring-2 hover:ring-gray-300 dark:hover:ring-neutral-600'
                }`}
                style={{ backgroundColor: solidBaseColors[i] }}
              />
            )
          })}
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          onClick={handleCustomImage}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-gray-600 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 transition-all duration-150 hover:bg-gray-200 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white active:scale-[0.97]"
        >
          <SvgIcon svg={uploadSvg} size={14} />
          Upload Image
        </button>
        <button
          onClick={handleClear}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-800/30 transition-all duration-150 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300 active:scale-[0.97]"
        >
          <SvgIcon svg={trashSvg} size={14} />
          Remove
        </button>
      </div>
    </div>
  )
})

// --- Privacy Pane -------------------------------------------------------------

function PrivacyPane(): React.JSX.Element {
  const clearOnExit = useSettingsStore((s) => s.clearOnExit)
  const setClearOnExit = useSettingsStore((s) => s.setClearOnExit)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)

  const clearHistory = useCallback(() => {
    useHistoryStore.getState().clearAll()
    setConfirmAction(null)
  }, [])

  const clearDownloads = useCallback(() => {
    const store = useDownloadStore.getState()
    const ids = Object.keys(store.downloads)
    ids.forEach((id) => store.removeDownload(id))
    setConfirmAction(null)
  }, [])

  const clearBookmarks = useCallback(() => {
    const store = useBookmarkStore.getState()
    const urls = store.bookmarks.map((b) => b.url)
    urls.forEach((url) => store.removeBookmark(url))
    setConfirmAction(null)
  }, [])

  const clearAll = useCallback(() => {
    clearHistory()
    clearDownloads()
    clearBookmarks()
    setConfirmAction(null)
  }, [clearHistory, clearDownloads, clearBookmarks])

  type ClearAction = { label: string; id: string; onConfirm: () => void; destructive?: boolean }

  const actions: ClearAction[] = [
    { label: 'Clear History', id: 'history', onConfirm: clearHistory },
    { label: 'Clear Downloads', id: 'downloads', onConfirm: clearDownloads },
    { label: 'Clear Bookmarks', id: 'bookmarks', onConfirm: clearBookmarks },
    { label: 'Clear All Data', id: 'all', onConfirm: clearAll, destructive: true },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">Session</h3>
        <Desc>Control how data is managed between sessions.</Desc>
        <SettingRow label="Clear data on exit" desc="Wipe history, downloads, and bookmarks when the browser closes">
          <Toggle checked={clearOnExit} onChange={setClearOnExit} />
        </SettingRow>
      </div>

      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">Browsing Data</h3>
        <Desc>Permanently delete stored data. This cannot be undone.</Desc>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const isConfirming = confirmAction === action.id
            return (
              <button
                key={action.id}
                onClick={() => {
                  if (isConfirming) {
                    action.onConfirm()
                  } else {
                    setConfirmAction(action.id)
                    setTimeout(() => setConfirmAction((c) => c === action.id ? null : c), 3000)
                  }
                }}
                className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-150 active:scale-[0.97] ${
                  isConfirming
                    ? 'bg-red-500 dark:bg-red-500 text-white border border-red-500'
                    : action.destructive
                      ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-900/30'
                      : 'text-gray-600 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-700'
                }`}
              >
                {isConfirming ? 'Confirm?' : action.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// --- Search Engine Pane -------------------------------------------------------

const SearchEnginePane = memo(function SearchEnginePane(): React.JSX.Element {
  const engineId = useSearchEngineStore((s) => s.engineId)
  const setEngine = useSearchEngineStore((s) => s.setEngine)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">Default Search Engine</h3>
        <Desc>Choose the search engine used for address bar and new tab searches.</Desc>
        <div className="space-y-1.5">
          {SEARCH_ENGINES.map((engine) => {
            const isActive = engineId === engine.id
            return (
              <button
                key={engine.id}
                onClick={() => setEngine(engine.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm'
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold flex-shrink-0 ${
                  isActive
                    ? 'bg-white/20 dark:bg-black/20'
                    : 'bg-gray-200 dark:bg-neutral-700'
                }`}>
                  {engine.icon}
                </div>
                <span className="text-[13px] font-medium">{engine.name}</span>
                {isActive && (
                  <SvgIcon svg={checkSvg} size={14} className="ml-auto" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
})

// --- About Pane ---------------------------------------------------------------

function AboutPane(): React.JSX.Element {
  const ua = navigator.userAgent
  const chromeMatch = ua.match(/Chrome\/([\d.]+)/)
  const electronMatch = ua.match(/Electron\/([\d.]+)/)
  const chromeVersion = chromeMatch?.[1] ?? 'Unknown'
  const electronVersion = electronMatch?.[1] ?? 'Unknown'

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-1">Browser</h3>
      <p className="text-[13px] text-gray-500 dark:text-neutral-400 mb-6">Version 1.0.0</p>
      <div className="text-[11px] text-gray-400 dark:text-neutral-500 space-y-1">
        <p>Chromium {chromeVersion}</p>
        <p>Electron {electronVersion}</p>
        <p className="pt-2">Widevine DRM enabled</p>
      </div>
    </div>
  )
}

// --- Content Pane Router ------------------------------------------------------

function SettingsContent({ category }: { category: SettingsCategory }): React.JSX.Element {
  switch (category) {
    case 'general':
      return <GeneralPane />
    case 'appearance':
      return <AppearancePane />
    case 'wallpaper':
      return <WallpaperPane />
    case 'privacy':
      return <PrivacyPane />
    case 'search':
      return <SearchEnginePane />
    case 'about':
      return <AboutPane />
  }
}

// --- Sidebar ------------------------------------------------------------------

function Sidebar({
  activeCategory,
  onSelect
}: {
  activeCategory: SettingsCategory
  onSelect: (id: SettingsCategory) => void
}): React.JSX.Element {
  return (
    <nav className="flex flex-col gap-1">
      {CATEGORIES.map(({ id, label, icon }) => {
        const isActive = activeCategory === id
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-100 ${
              isActive
                ? 'bg-indigo-500 dark:bg-indigo-400 text-white dark:text-black shadow-sm'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <SvgIcon svg={icon} size={16} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

// --- Main Panel ---------------------------------------------------------------

function SettingsPanelInner(): React.JSX.Element {
  const closeSettings = useUIStore((s) => s.closeSettings)
  const panelRef = useRef<HTMLDivElement>(null)
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general')

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeSettings()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [closeSettings])

  const categoryLabel = CATEGORIES.find((c) => c.id === activeCategory)?.label ?? ''

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[80] bg-black/30 dark:bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onMouseDown={closeSettings}
      />

      <div className="fixed inset-0 z-[85] flex items-center justify-center pointer-events-none">
        <motion.div
          ref={panelRef}
          className="w-[720px] h-[500px] rounded-3xl overflow-hidden bg-white/95 dark:bg-neutral-900/95 shadow-2xl border border-gray-200/80 dark:border-neutral-700 [app-region:no-drag] pointer-events-auto"
          style={{ transformOrigin: '50% 100%', perspective: 800 }}
          initial={{ y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -20 }}
          animate={{ y: 0, scaleX: 1, scaleY: 1, opacity: 1, rotateX: 0 }}
          exit={{ y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -14 }}
          transition={{ ...springPanel, damping: 26 }}
        >
          <div className="flex h-full">
            <div className="w-[180px] flex-shrink-0 bg-gray-50 dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700 flex flex-col">
              <div className="px-4 pt-5 pb-3">
                <h2 className="text-[13px] font-bold text-gray-900 dark:text-white tracking-wide flex items-center gap-2">
                  Settings
                </h2>
              </div>
              <div className="flex-1 px-2.5 pb-4">
                <Sidebar activeCategory={activeCategory} onSelect={setActiveCategory} />
              </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-900">
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-neutral-800">
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">
                  {categoryLabel}
                </h3>
                <button
                  onClick={closeSettings}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-150"
                >
                  <SvgIcon svg={closeSvg} size={13} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
                <SettingsContent category={activeCategory} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

export const SettingsPanel = memo(SettingsPanelInner)