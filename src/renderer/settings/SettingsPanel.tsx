import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import sunSvg from '@/assets/icons/Weather/Sun_1.svg?raw'
import moonSvg from '@/assets/icons/Weather/Moon.svg?raw'
import displaySvg from '@/assets/icons/Devices/Display.svg?raw'
import checkSvg from '@/assets/icons/Interface/Check.svg?raw'
import uploadSvg from '@/assets/icons/Objects/Tray_Arrow_Up.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import cameraFiltersSvg from '@/assets/icons/Objects/Camera_Filters.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import brushSvg from '@/assets/icons/Objects/Brush.svg?raw'
import cameraSvg from '@/assets/icons/Objects/Camera_Rctangle.svg?raw'
import infoSvg from '@/assets/icons/Interface/Warn_Info.svg?raw'
import settingsSvg from '@/assets/icons/Objects/Settings.svg?raw'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import { useUIStore } from '@/store/uiStore'
import { WALLPAPER_PRESETS, SOLID_COLOR_PRESETS } from '@/theme/presets'

// ─── Constants ───────────────────────────────────────────────────────────────

const springPanel = { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.8 }

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

// ─── Sidebar Categories ──────────────────────────────────────────────────────

type SettingsCategory = 'appearance' | 'wallpaper' | 'about'

interface CategoryItem {
  id: SettingsCategory
  label: string
  icon: string
}

const CATEGORIES: CategoryItem[] = [
  { id: 'appearance', label: 'Appearance', icon: brushSvg },
  { id: 'wallpaper', label: 'Wallpaper', icon: cameraSvg },
  { id: 'about', label: 'About', icon: infoSvg }
]

// ─── Appearance Pane ─────────────────────────────────────────────────────────

function AppearancePane(): React.JSX.Element {
  const themeMode = useThemeStore((s) => s.themeMode)
  const setThemeMode = useThemeStore((s) => s.setThemeMode)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">Theme</h3>
        <p className="text-[12px] text-gray-500 dark:text-neutral-400 mb-4">
          Choose how the browser interface looks.
        </p>
        <div className="flex gap-3">
          {THEME_MODES.map(({ mode, label, icon }) => {
            const isActive = themeMode === mode
            return (
              <button
                key={mode}
                onClick={() => setThemeMode(mode)}
                className={`flex-1 flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${
                  isActive
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg'
                    : 'bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-750'
                }`}
              >
                <SvgIcon svg={icon} size={22} />
                <span className="text-[12px] font-semibold">{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Wallpaper Pane ──────────────────────────────────────────────────────────

function WallpaperPane(): React.JSX.Element {
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
      {/* Gradients */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <SvgIcon svg={cameraFiltersSvg} size={14} className="text-gray-400 dark:text-neutral-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500">
            Gradients
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {WALLPAPER_PRESETS.map((preset, i) => {
            const isActive = wallpaper === preset.dataUrl
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.dataUrl)}
                title={preset.name}
                className="relative aspect-[16/10] rounded-xl overflow-hidden transition-all duration-150 hover:scale-[1.04] active:scale-[0.97]"
                style={{
                  backgroundImage: `url(${preset.dataUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: isActive ? '2.5px solid #6366f1' : '1px solid rgba(128,128,128,0.2)',
                  boxShadow: isActive
                    ? '0 0 0 1px #6366f1, 0 2px 8px rgba(0,0,0,0.12)'
                    : '0 1px 3px rgba(0,0,0,0.06)',
                  opacity: 0,
                  animation: `menu-item-in 150ms ease-out ${i * 25}ms forwards`
                }}
              >
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-white/90 shadow-md">
                      <SvgIcon svg={checkSvg} size={11} className="text-indigo-500" />
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Solid Colors */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500">
            Solid Colors
          </span>
        </div>
        <div className="grid grid-cols-8 gap-2">
          {SOLID_COLOR_PRESETS.map((color, i) => {
            const isActive = wallpaper === SOLID_DATA_URL_MAP.get(color.hex)
            return (
              <button
                key={color.hex}
                onClick={() => handleSelectSolid(color.hex)}
                title={color.name}
                className="relative aspect-square rounded-xl overflow-hidden transition-all duration-150 hover:scale-[1.08] active:scale-[0.97]"
                style={{
                  backgroundColor: color.hex,
                  border: isActive ? '2.5px solid #6366f1' : '1px solid rgba(128,128,128,0.2)',
                  boxShadow: isActive
                    ? '0 0 0 1px #6366f1, 0 2px 8px rgba(0,0,0,0.12)'
                    : '0 1px 3px rgba(0,0,0,0.06)',
                  opacity: 0,
                  animation: `menu-item-in 150ms ease-out ${i * 15}ms forwards`
                }}
              >
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center bg-white/90 shadow-md">
                      <SvgIcon svg={checkSvg} size={9} className="text-indigo-500" />
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5">
        <button
          onClick={handleCustomImage}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-gray-600 dark:text-neutral-300 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 transition-all duration-150 hover:scale-[1.02] hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-white active:scale-[0.97]"
        >
          <SvgIcon svg={uploadSvg} size={14} />
          Upload Image
        </button>
        <button
          onClick={handleClear}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-800/30 transition-all duration-150 hover:scale-[1.02] hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300 active:scale-[0.97]"
        >
          <SvgIcon svg={trashSvg} size={14} />
          Remove
        </button>
      </div>
    </div>
  )
}

// ─── About Pane ──────────────────────────────────────────────────────────────

function AboutPane(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg mb-4">
        <SvgIcon svg={settingsSvg} size={32} className="text-white" />
      </div>
      <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-1">Browser</h3>
      <p className="text-[13px] text-gray-500 dark:text-neutral-400 mb-4">Version 1.0.0</p>
      <div className="text-[11px] text-gray-400 dark:text-neutral-500 space-y-0.5">
        <p>Built with Electron &amp; React</p>
        <p>Widevine DRM enabled</p>
      </div>
    </div>
  )
}

// ─── Content Pane Router ─────────────────────────────────────────────────────

function SettingsContent({ category }: { category: SettingsCategory }): React.JSX.Element {
  switch (category) {
    case 'appearance':
      return <AppearancePane />
    case 'wallpaper':
      return <WallpaperPane />
    case 'about':
      return <AboutPane />
  }
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

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
                ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white'
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

// ─── Main Panel ──────────────────────────────────────────────────────────────

function SettingsPanelInner(): React.JSX.Element {
  const closeSettings = useUIStore((s) => s.closeSettings)
  const panelRef = useRef<HTMLDivElement>(null)
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance')

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
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[80] bg-black/30 dark:bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onMouseDown={closeSettings}
      />

      {/* Panel — genie entrance from the floating controls bar */}
      <div className="fixed inset-0 z-[85] flex items-center justify-center pointer-events-none">
        <motion.div
          ref={panelRef}
          className="w-[640px] h-[440px] rounded-2xl overflow-hidden backdrop-blur-md bg-white/50 dark:bg-neutral-900/50 shadow-2xl border border-gray-200/80 dark:border-neutral-700 [app-region:no-drag] pointer-events-auto"
          style={{ transformOrigin: '50% 100%', perspective: 800 }}
          initial={{ y: 220, scaleX: 0.3, scaleY: 0.06, opacity: 0, rotateX: -15 }}
          animate={{ y: 0, scaleX: 1, scaleY: 1, opacity: 1, rotateX: 0 }}
          exit={{ y: 180, scaleX: 0.35, scaleY: 0.06, opacity: 0, rotateX: -10 }}
          transition={springPanel}
        >
        <div className="flex h-full">
          {/* ─── Sidebar ─── */}
          <div className="w-[180px] flex-shrink-0 bg-gray-50/80 dark:bg-neutral-800/80 border-r border-gray-200 dark:border-neutral-700 flex flex-col">
            <div className="px-4 pt-5 pb-3">
              <h2 className="text-[13px] font-bold text-gray-900 dark:text-white tracking-relaxed flex items-center gap-2">
                Settings
              </h2>
            </div>
            <div className="flex-1 px-2.5 pb-4">
              <Sidebar activeCategory={activeCategory} onSelect={setActiveCategory} />
            </div>
          </div>

          {/* ─── Content ─── */}
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
