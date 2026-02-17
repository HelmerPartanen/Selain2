import { memo, useCallback, useEffect, useState } from 'react'
import { X, Sun, Moon, Desktop, Check, UploadSimple, Trash, Images } from '@phosphor-icons/react'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import { useSettingsPanelStore } from '@/store/settingsPanelStore'
import { useMultiSpring, useSpring, SPRINGS } from '@/hooks/useSpring'
import { WALLPAPER_PRESETS, SOLID_COLOR_PRESETS } from '@/theme/presets'

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
          <button
            key={mode}
            onClick={() => setThemeMode(mode)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-150"
            style={
              isActive
                ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 1px 6px var(--accent-glow)' }
                : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-glass)' }
            }
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--bg-surface-hover)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--bg-surface)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }
            }}
          >
            <Icon size={15} weight={isActive ? 'fill' : 'regular'} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

function WallpaperPicker(): React.JSX.Element {
  const wallpaper = useThemeStore((s) => s.wallpaper)
  const setWallpaper = useThemeStore((s) => s.setWallpaper)

  const handleCustomImage = useCallback(async () => {
    try {
      const dataUrl = await window.electronAPI.openImageDialog()
      if (dataUrl) setWallpaper(dataUrl)
    } catch { /* noop */ }
  }, [setWallpaper])

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Images size={13} weight="bold" style={{ color: 'var(--text-muted)' }} />
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Gradients</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {WALLPAPER_PRESETS.map((preset) => (
            <WallpaperSwatch
              key={preset.id}
              isActive={wallpaper === preset.dataUrl}
              title={preset.name}
              onClick={() => setWallpaper(preset.dataUrl)}
              style={{ backgroundImage: `url(${preset.dataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              aspect="aspect-[16/10]"
            />
          ))}
        </div>
      </div>

      <div>
        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Solid Colors</span>
        <div className="grid grid-cols-6 gap-2 mt-2">
          {SOLID_COLOR_PRESETS.map((color) => (
            <WallpaperSwatch
              key={color.hex}
              isActive={wallpaper === solidToDataUrl(color.hex)}
              title={color.name}
              onClick={() => setWallpaper(solidToDataUrl(color.hex))}
              style={{ backgroundColor: color.hex }}
              aspect="aspect-square"
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleCustomImage}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-100"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-glass)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <UploadSimple size={14} weight="bold" />
          Upload
        </button>
        <button
          onClick={() => setWallpaper(null)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-100"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-glass)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'hsla(0,60%,50%,0.15)'; e.currentTarget.style.color = 'hsl(0,70%,65%)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <Trash size={14} weight="bold" />
          Remove
        </button>
      </div>
    </div>
  )
}

function WallpaperSwatch({ isActive, title, onClick, style, aspect }: {
  isActive: boolean; title: string; onClick: () => void; style: React.CSSProperties; aspect: string
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`relative ${aspect} rounded-xl overflow-hidden transition-all duration-150 hover:scale-[1.06] active:scale-100`}
      style={{
        ...style,
        border: isActive ? '2px solid var(--accent)' : '1px solid var(--border-glass)',
        boxShadow: isActive ? '0 0 0 2px var(--accent-glow), var(--shadow-glass-sm)' : 'var(--shadow-glass-sm)',
        outline: 'none'
      }}
    >
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}>
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            <Check size={11} weight="bold" color="#fff" />
          </div>
        </div>
      )}
    </button>
  )
}

function SettingsPanelInner(): React.JSX.Element {
  const isOpen = useSettingsPanelStore((s) => s.isOpen)
  const close = useSettingsPanelStore((s) => s.close)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (isOpen) setMounted(true)
  }, [isOpen])

  const panel = useMultiSpring(
    {
      scale: isOpen ? 1 : 0.94,
      opacity: isOpen ? 1 : 0,
      y: isOpen ? 0 : 16
    },
    isOpen ? SPRINGS.quick : SPRINGS.stiff
  )

  const backdrop = useSpring(isOpen ? 1 : 0, SPRINGS.snappy)

  useEffect(() => {
    if (!isOpen && (panel.opacity ?? 0) < 0.01) setMounted(false)
  }, [isOpen, panel.opacity])

  if (!mounted) return <></>

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center [app-region:no-drag]">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0,0,0,${backdrop * 0.3})`, backdropFilter: `blur(${backdrop * 8}px)` }}
        onMouseDown={close}
      />

      <div
        className="relative z-10 w-[520px] max-h-[80vh] rounded-2xl overflow-hidden bg-white/70 backdrop-blur-2xl shadow-2xl border border-white/30"
        style={{
          transform: `translateY(${panel.y}px) scale(${panel.scale})`,
          opacity: panel.opacity,
          willChange: 'transform, opacity'
        }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Settings</h2>
          <button
            onClick={close}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-75 hover:bg-gray-200/60"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="px-6 pb-6 overflow-y-auto max-h-[calc(80vh-60px)] space-y-5 [&::-webkit-scrollbar]:w-1">
          <Section title="Theme" subtitle="Control how the interface looks.">
            <ThemeModePicker />
          </Section>
          <Section title="Wallpaper" subtitle="Personalize your browser background.">
            <WallpaperPicker />
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="glass-heavy rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-glass-sm)' }}>
      <div className="px-5 pt-4 pb-1">
        <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      </div>
      <div className="px-5 pb-4 pt-3">{children}</div>
    </section>
  )
}

export const SettingsPanel = memo(SettingsPanelInner)
