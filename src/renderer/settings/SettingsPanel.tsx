import { memo, useCallback, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import {
  Sun,
  Moon,
  Desktop,
  Check,
  UploadSimple,
  Trash,
  Images,
  X
} from '@phosphor-icons/react'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import { useUIStore } from '@/store/uiStore'
import { WALLPAPER_PRESETS, SOLID_COLOR_PRESETS } from '@/theme/presets'

const springPanel = { type: 'spring' as const, stiffness: 420, damping: 28 }
const springItem = { type: 'spring' as const, stiffness: 450, damping: 26 }

function solidToDataUrl(hex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${hex}"/></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

const THEME_MODES: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Desktop }
]

function ThemeModePicker(): React.JSX.Element {
  const themeMode = useThemeStore((s) => s.themeMode)
  const setThemeMode = useThemeStore((s) => s.setThemeMode)

  return (
    <div className="flex gap-2">
      {THEME_MODES.map(({ mode, label, icon: Icon }) => {
        const isActive = themeMode === mode
        return (
          <motion.button
            key={mode}
            onClick={() => setThemeMode(mode)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold"
            style={
              isActive
                ? { background: '#111827', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                : { background: '#f9fafb', color: '#4b5563', border: '1px solid #e5e7eb' }
            }
            whileHover={!isActive ? { scale: 1.02, backgroundColor: '#e5e7eb' } : { scale: 1.01 }}
            whileTap={{ scale: 0.96 }}
            transition={springItem}
          >
            <Icon size={15} weight={isActive ? 'fill' : 'bold'} />
            {label}
          </motion.button>
        )
      })}
    </div>
  )
}

function WallpaperPicker(): React.JSX.Element {
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
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5 mb-2.5">
          <Images size={13} weight="bold" className="text-gray-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Gradients</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {WALLPAPER_PRESETS.map((preset, i) => {
            const isActive = wallpaper === preset.dataUrl
            return (
              <motion.button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.dataUrl)}
                title={preset.name}
                className="relative aspect-[16/10] rounded-xl overflow-hidden"
                style={{
                  backgroundImage: `url(${preset.dataUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: isActive ? '2.5px solid #111827' : '1px solid #e5e7eb',
                  boxShadow: isActive ? '0 0 0 1px #111827, 0 2px 8px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)'
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springItem, delay: i * 0.03 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.97 }}
              >
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-900 shadow-md">
                      <Check size={11} weight="bold" color="#fff" />
                    </div>
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Solid Colors</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {SOLID_COLOR_PRESETS.map((color, i) => {
            const isActive = wallpaper === solidToDataUrl(color.hex)
            return (
              <motion.button
                key={color.hex}
                onClick={() => handleSelectSolid(color.hex)}
                title={color.name}
                className="relative aspect-square rounded-xl overflow-hidden"
                style={{
                  backgroundColor: color.hex,
                  border: isActive ? '2.5px solid #111827' : '1px solid #e5e7eb',
                  boxShadow: isActive ? '0 0 0 1px #111827, 0 2px 8px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)'
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springItem, delay: i * 0.02 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.97 }}
              >
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-900 shadow-md">
                      <Check size={11} weight="bold" color="#fff" />
                    </div>
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <motion.button
          onClick={handleCustomImage}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-gray-600 bg-gray-50 border border-gray-200"
          whileHover={{ scale: 1.02, backgroundColor: '#e5e7eb', color: '#111827' }}
          whileTap={{ scale: 0.97 }}
          transition={springItem}
        >
          <UploadSimple size={14} weight="bold" />
          Upload Image
        </motion.button>
        <motion.button
          onClick={handleClear}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-red-500 bg-red-50 border border-red-100"
          whileHover={{ scale: 1.02, backgroundColor: '#fecaca', color: '#dc2626' }}
          whileTap={{ scale: 0.97 }}
          transition={springItem}
        >
          <Trash size={14} weight="bold" />
          Remove
        </motion.button>
      </div>
    </div>
  )
}

function SettingsPanelInner(): React.JSX.Element {
  const closeSettings = useUIStore((s) => s.closeSettings)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeSettings()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [closeSettings])

  return (
    <>
      <div className="fixed inset-0 z-[80]" onMouseDown={closeSettings} />

      <motion.div
        ref={panelRef}
        className="absolute bottom-full mb-3 left-0 z-[85] w-[420px] max-h-[65vh] overflow-y-auto overflow-x-hidden rounded-2xl bg-white shadow-2xl border border-gray-100 [&::-webkit-scrollbar]:w-1"
        style={{ originX: 0, originY: 1 }}
        initial={{ scale: 0.8, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 16 }}
        transition={springPanel}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3 bg-white border-b border-gray-100">
          <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">Settings</h2>
          <button
            onClick={closeSettings}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <motion.section
            className="bg-gray-50 rounded-xl p-4 border border-gray-100"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springItem, delay: 0.06 }}
          >
            <h3 className="text-[13px] font-bold text-gray-900 mb-1">Theme</h3>
            <p className="text-[11px] text-gray-500 mb-3">Control how the interface looks.</p>
            <ThemeModePicker />
          </motion.section>

          <motion.section
            className="bg-gray-50 rounded-xl p-4 border border-gray-100"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springItem, delay: 0.12 }}
          >
            <h3 className="text-[13px] font-bold text-gray-900 mb-1">Wallpaper</h3>
            <p className="text-[11px] text-gray-500 mb-3">Personalize your browser background.</p>
            <WallpaperPicker />
          </motion.section>
        </div>
      </motion.div>
    </>
  )
}

export const SettingsPanel = memo(SettingsPanelInner)
