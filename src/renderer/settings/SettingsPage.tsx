// ─── Settings Page ───────────────────────────────────────────────────────────
// A dedicated page for appearance customization.
// Accessed via browser://settings.

import { memo, useCallback, useState } from 'react'
import {
  Image as ImageIcon,
  PaintBucket,
  Sun,
  Moon,
  CircleHalf,
  ArrowLeft,
  Upload,
  X,
  Check
} from '@phosphor-icons/react'
import { useThemeStore } from '@/store/themeStore'
import { useTabStore } from '@/store/tabStore'
import { WALLPAPER_PRESETS, SOLID_COLOR_PRESETS } from '@/theme/presets'

// ─── Main Settings Page ──────────────────────────────────────────────────────

function SettingsPageInner(): React.JSX.Element {
  const handleBack = useCallback(() => {
    const { activeTabId, updateTab } = useTabStore.getState()
    if (activeTabId) {
      updateTab(activeTabId, { url: 'browser://newtab', title: 'New Tab' })
    }
  }, [])

  return (
    <div className="absolute inset-0 bg-surface overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 className="text-2xl font-semibold text-text">Settings</h1>
        </div>

        {/* Appearance Section */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-text mb-1">Appearance</h2>
          <p className="text-sm text-text-muted mb-6">
            Customize how your browser looks. Colors adapt automatically to your wallpaper.
          </p>

          {/* Theme Mode Toggle */}
          <ThemeModeToggle />

          {/* Live Preview */}
          <LivePreview />

          {/* Wallpaper Picker */}
          <WallpaperPicker />

          {/* Solid Color Picker */}
          <SolidColorPicker />
        </section>
      </div>
    </div>
  )
}

// ─── Theme Mode Toggle ──────────────────────────────────────────────────────

function ThemeModeToggle(): React.JSX.Element {
  const themeMode = useThemeStore((s) => s.themeMode)
  const setThemeMode = useThemeStore((s) => s.setThemeMode)

  const modes = [
    { value: 'auto' as const, label: 'Auto', icon: CircleHalf },
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon }
  ]

  return (
    <div className="mb-6">
      <label className="text-sm font-medium text-text-muted mb-2 block">Theme Mode</label>
      <div className="flex gap-1 bg-surface-dim p-1 rounded-lg w-fit">
        {modes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setThemeMode(value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150
              ${themeMode === value
                ? 'bg-surface-raised text-text shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface-hover'
              }`}
          >
            <Icon size={16} weight={themeMode === value ? 'fill' : 'regular'} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Live Preview ────────────────────────────────────────────────────────────

function LivePreview(): React.JSX.Element {
  const tokens = useThemeStore((s) => s.tokens)

  return (
    <div className="mb-6">
      <label className="text-sm font-medium text-text-muted mb-2 block">Preview</label>
      <div
        className="rounded-xl border border-border overflow-hidden"
        style={{ backgroundColor: tokens['surface-dim'] }}
      >
        {/* Mini title bar */}
        <div className="flex items-center h-8 px-3 gap-2" style={{ backgroundColor: tokens['surface-dim'] }}>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tokens['text-dim'] }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tokens['text-dim'] }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tokens['text-dim'] }} />
          </div>
          {/* Mini tabs */}
          <div className="flex gap-1 ml-2">
            <div className="px-3 py-1 rounded-md text-[10px]" style={{ backgroundColor: tokens['surface-raised'], color: tokens.text }}>
              Active Tab
            </div>
            <div className="px-3 py-1 rounded-md text-[10px]" style={{ color: tokens['text-muted'] }}>
              Tab 2
            </div>
          </div>
        </div>
        {/* Mini URL bar */}
        <div className="px-3 py-1.5" style={{ backgroundColor: tokens.surface }}>
          <div
            className="h-6 rounded-md px-3 flex items-center text-[10px]"
            style={{
              backgroundColor: tokens['surface-dim'],
              color: tokens['text-muted'],
              border: `1px solid ${tokens.border}`
            }}
          >
            browser://newtab
          </div>
        </div>
        {/* Mini content */}
        <div className="h-14 flex items-center justify-center" style={{ backgroundColor: tokens.surface }}>
          <span className="text-xs" style={{ color: tokens.text }}>Content Area</span>
        </div>
      </div>
    </div>
  )
}

// ─── Wallpaper Picker ────────────────────────────────────────────────────────

function WallpaperPicker(): React.JSX.Element {
  const wallpaperSource = useThemeStore((s) => s.wallpaperSource)
  const setWallpaper = useThemeStore((s) => s.setWallpaper)
  const clearWallpaper = useThemeStore((s) => s.clearWallpaper)
  const wallpaperType = useThemeStore((s) => s.wallpaperType)
  const [isUploading, setIsUploading] = useState(false)

  const handlePresetClick = useCallback(async (preset: typeof WALLPAPER_PRESETS[0]) => {
    // For presets, use the known dominant color directly (no extraction needed)
    await setWallpaper(preset.dataUrl, 'image', preset.dominantColor)
  }, [setWallpaper])

  const handleUpload = useCallback(async () => {
    setIsUploading(true)
    try {
      const dataUrl = await window.electronAPI.openImageDialog()
      if (dataUrl) {
        await setWallpaper(dataUrl, 'image')
      }
    } finally {
      setIsUploading(false)
    }
  }, [setWallpaper])

  const handleClear = useCallback(() => {
    clearWallpaper()
  }, [clearWallpaper])

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-text-muted flex items-center gap-2">
          <ImageIcon size={16} />
          Wallpapers
        </label>
        {wallpaperType === 'image' && (
          <button
            onClick={handleClear}
            className="text-xs text-text-dim hover:text-text flex items-center gap-1 transition-colors"
          >
            <X size={12} />
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {/* Upload card */}
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-border-hover
            flex flex-col items-center justify-center gap-1 text-text-dim hover:text-text-muted
            transition-colors duration-150 text-xs"
        >
          <Upload size={20} weight="regular" />
          {isUploading ? 'Loading...' : 'Upload'}
        </button>

        {/* Preset wallpapers */}
        {WALLPAPER_PRESETS.map((preset) => {
          const isActive = wallpaperType === 'image' && wallpaperSource === preset.dataUrl
          return (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all duration-150
                ${isActive
                  ? 'border-accent ring-2 ring-accent/25'
                  : 'border-border hover:border-border-hover'
                }`}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${preset.dataUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              {isActive && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                  <Check size={12} weight="bold" className="text-white" />
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                <span className="text-[10px] text-white/90 font-medium">{preset.name}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Solid Color Picker ──────────────────────────────────────────────────────

function SolidColorPicker(): React.JSX.Element {
  const solidColor = useThemeStore((s) => s.solidColor)
  const wallpaperType = useThemeStore((s) => s.wallpaperType)
  const setSolidColor = useThemeStore((s) => s.setSolidColor)
  const [customHex, setCustomHex] = useState('')

  const handlePresetClick = useCallback((hex: string) => {
    setSolidColor(hex)
    setCustomHex('')
  }, [setSolidColor])

  const handleCustomSubmit = useCallback(() => {
    const hex = customHex.trim()
    if (/^#?[0-9a-fA-F]{6}$/.test(hex)) {
      setSolidColor(hex.startsWith('#') ? hex : `#${hex}`)
      setCustomHex('')
    }
  }, [customHex, setSolidColor])

  return (
    <div className="mb-6">
      <label className="text-sm font-medium text-text-muted flex items-center gap-2 mb-2">
        <PaintBucket size={16} />
        Solid Colors
      </label>

      <div className="grid grid-cols-6 gap-2 mb-3">
        {SOLID_COLOR_PRESETS.map((preset) => {
          const isActive = wallpaperType === 'solid' && solidColor === preset.hex
          return (
            <button
              key={preset.hex}
              onClick={() => handlePresetClick(preset.hex)}
              title={preset.name}
              className={`aspect-square rounded-lg border-2 transition-all duration-150 relative
                ${isActive
                  ? 'border-accent ring-2 ring-accent/25 scale-105'
                  : 'border-border hover:border-border-hover hover:scale-105'
                }`}
              style={{ backgroundColor: preset.hex }}
            >
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check
                    size={16}
                    weight="bold"
                    className={preset.hex === '#f0f0f5' || preset.hex === '#faf5ee' || preset.hex === '#e8f0fe' || preset.hex === '#ecfdf5'
                      ? 'text-gray-800'
                      : 'text-white'}
                  />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Custom hex input */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">#</span>
          <input
            type="text"
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSubmit() }}
            placeholder="Custom hex color"
            maxLength={6}
            className="w-full pl-7 pr-3 py-2 rounded-lg bg-surface-dim border border-border
              text-text text-sm placeholder:text-text-dim focus:outline-none focus:ring-2
              focus:ring-accent/25 focus:border-border-hover transition-colors"
          />
        </div>
        <button
          onClick={handleCustomSubmit}
          disabled={!/^[0-9a-fA-F]{6}$/.test(customHex.trim())}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium
            disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          Apply
        </button>
        {/* Native color picker */}
        <label className="relative">
          <input
            type="color"
            value={wallpaperType === 'solid' && solidColor ? solidColor : '#1e1e1e'}
            onChange={(e) => setSolidColor(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="w-10 h-10 rounded-lg border border-border cursor-pointer hover:border-border-hover transition-colors overflow-hidden">
            <div
              className="w-full h-full"
              style={{ backgroundColor: wallpaperType === 'solid' && solidColor ? solidColor : '#1e1e1e' }}
            />
          </div>
        </label>
      </div>
    </div>
  )
}

export const SettingsPage = memo(SettingsPageInner)
