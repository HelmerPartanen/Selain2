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
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium"
            style={
              isActive
                ? { background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 1px 6px var(--accent-glow)' }
                : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-glass)' }
            }
            whileHover={!isActive ? { scale: 1.04, backgroundColor: 'var(--bg-surface-hover)' } : { scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={springItem}
          >
            <Icon size={15} weight={isActive ? 'fill' : 'regular'} />
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
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Images size={13} weight="bold" style={{ color: 'var(--text-muted)' }} />
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Gradients</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
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
                  border: isActive ? '2px solid var(--accent)' : '1px solid var(--border-glass)',
                  boxShadow: isActive ? '0 0 0 2px var(--accent-glow), var(--shadow-glass-sm)' : 'var(--shadow-glass-sm)'
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springItem, delay: i * 0.03 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
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
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Solid Colors</span>
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
                  border: isActive ? '2px solid var(--accent)' : '1px solid var(--border-glass)',
                  boxShadow: isActive ? '0 0 0 2px var(--accent-glow), var(--shadow-glass-sm)' : 'var(--shadow-glass-sm)'
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springItem, delay: i * 0.02 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                      <Check size={11} weight="bold" color="#fff" />
                    </div>
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <motion.button
          onClick={handleCustomImage}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium overflow-hidden"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-glass)' }}
          whileHover={{ scale: 1.02, backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-primary)' }}
          whileTap={{ scale: 0.97 }}
          transition={springItem}
        >
          <UploadSimple size={14} weight="bold" />
          Upload Image
        </motion.button>
        <motion.button
          onClick={handleClear}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium overflow-hidden"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-glass)' }}
          whileHover={{ scale: 1.02, backgroundColor: 'hsla(0,60%,50%,0.15)', color: 'hsl(0,70%,65%)' }}
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
        className="absolute bottom-full mb-3 left-0 z-[85] w-[400px] max-h-[65vh] overflow-y-auto overflow-x-hidden rounded-2xl bg-white/80 backdrop-blur-xl shadow-2xl [&::-webkit-scrollbar]:w-1"
        style={{ originX: 0, originY: 1 }}
        initial={{ scale: 0.8, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 16 }}
        transition={springPanel}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-2 bg-white/60 backdrop-blur-md">
          <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Settings</h2>
          <motion.button
            onClick={closeSettings}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ color: 'var(--text-muted)' }}
            whileHover={{ scale: 1.1, backgroundColor: 'var(--bg-surface-hover)' }}
            whileTap={{ scale: 0.9 }}
          >
            <X size={14} weight="bold" />
          </motion.button>
        </div>

        <div className="px-5 pb-5 space-y-5">
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springItem, delay: 0.06 }}
          >
            <h3 className="text-[13px] font-semibold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>Theme</h3>
            <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>Control how the interface looks.</p>
            <ThemeModePicker />
          </motion.section>

          <div className="border-t" style={{ borderColor: 'var(--border-glass)' }} />

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springItem, delay: 0.12 }}
          >
            <h3 className="text-[13px] font-semibold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>Wallpaper</h3>
            <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>Personalize your browser background.</p>
            <WallpaperPicker />
          </motion.section>
        </div>
      </motion.div>
    </>
  )
}

export const SettingsPanel = memo(SettingsPanelInner)
