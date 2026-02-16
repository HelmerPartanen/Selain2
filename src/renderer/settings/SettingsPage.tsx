// ─── Settings Page ───────────────────────────────────────────────────────────
// Appearance customization: theme mode, wallpaper selection.
// Accessed via browser://settings.

import { memo, useCallback } from 'react'
import {
  ArrowLeft,
  Sun,
  Moon,
  Desktop,
  Check,
  UploadSimple,
  Trash,
  Images
} from '@phosphor-icons/react'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import { useTabStore } from '@/store/tabStore'
import { WALLPAPER_PRESETS, SOLID_COLOR_PRESETS } from '@/theme/presets'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function solidToDataUrl(hex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${hex}"/></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

// ─── Main Settings Page ──────────────────────────────────────────────────────

function SettingsPageInner(): React.JSX.Element {
  const handleBack = useCallback(() => {
    const { activeTabId, updateTab } = useTabStore.getState()
    if (activeTabId) {
      updateTab(activeTabId, { url: 'browser://newtab', title: 'New Tab' })
    }
  }, [])

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl transition-colors duration-100"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        </div>

        {/* ── Theme Mode Section ───────────────────────────────────────── */}
        <SettingsCard title="Theme" subtitle="Control how the interface looks.">
          <ThemeModePicker />
        </SettingsCard>

        {/* ── Wallpaper Section ────────────────────────────────────────── */}
        <SettingsCard title="Wallpaper" subtitle="Personalize your browser background.">
          <WallpaperPicker />
        </SettingsCard>
      </div>
    </div>
  )
}

// ─── Reusable Settings Card ──────────────────────────────────────────────────

function SettingsCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section
      className="mb-6 glass-heavy rounded-2xl overflow-hidden"
      style={{ boxShadow: 'var(--shadow-glass-sm)' }}
    >
      <div className="px-6 pt-5 pb-1">
        <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      </div>
      <div className="px-6 pb-5 pt-4">
        {children}
      </div>
    </section>
  )
}

// ─── Theme Mode Picker ───────────────────────────────────────────────────────

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
                ? { background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 1px 6px var(--accent-glow)' }
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

// ─── Wallpaper Picker ────────────────────────────────────────────────────────

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
      {/* Gradient Presets */}
      <div>
        <SectionLabel icon={<Images size={13} weight="bold" />} text="Gradients" />
        <div className="grid grid-cols-4 gap-2.5 mt-2">
          {WALLPAPER_PRESETS.map((preset) => {
            const isActive = wallpaper === preset.dataUrl
            return (
              <WallpaperSwatch
                key={preset.id}
                isActive={isActive}
                title={preset.name}
                onClick={() => handleSelectPreset(preset.dataUrl)}
                style={{
                  backgroundImage: `url(${preset.dataUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
                aspect="aspect-[16/10]"
              />
            )
          })}
        </div>
      </div>

      {/* Solid Colors */}
      <div>
        <SectionLabel text="Solid Colors" />
        <div className="grid grid-cols-6 gap-2 mt-2">
          {SOLID_COLOR_PRESETS.map((color) => {
            const isActive = wallpaper === solidToDataUrl(color.hex)
            return (
              <WallpaperSwatch
                key={color.hex}
                isActive={isActive}
                title={color.name}
                onClick={() => handleSelectSolid(color.hex)}
                style={{ backgroundColor: color.hex }}
                aspect="aspect-square"
              />
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <ActionButton icon={<UploadSimple size={14} weight="bold" />} label="Upload Image" onClick={handleCustomImage} />
        <ActionButton icon={<Trash size={14} weight="bold" />} label="Remove" onClick={handleClear} variant="danger" />
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ text, icon }: { text: string; icon?: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span style={{ color: 'var(--text-muted)' }}>{icon}</span>}
      <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{text}</span>
    </div>
  )
}

function WallpaperSwatch(
  { isActive, title, onClick, style, aspect }:
  { isActive: boolean; title: string; onClick: () => void; style: React.CSSProperties; aspect: string }
): React.JSX.Element {
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
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'var(--accent)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
          >
            <Check size={11} weight="bold" color="#fff" />
          </div>
        </div>
      )}
    </button>
  )
}

function ActionButton(
  { icon, label, onClick, variant = 'default' }:
  { icon: React.ReactNode; label: string; onClick: () => void; variant?: 'default' | 'danger' }
): React.JSX.Element {
  const hoverBg = variant === 'danger' ? 'hsla(0,60%,50%,0.15)' : 'var(--bg-surface-hover)'
  const hoverColor = variant === 'danger' ? 'hsl(0,70%,65%)' : 'var(--text-primary)'

  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-100"
      style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border-glass)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      {icon}
      {label}
    </button>
  )
}

export const SettingsPage = memo(SettingsPageInner)
