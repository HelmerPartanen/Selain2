// ─── Settings Page ───────────────────────────────────────────────────────────
// A dedicated page for appearance customization.
// Accessed via browser://settings.

import { memo, useCallback, useState } from 'react'
import {
  Image as ImageIcon,
  PaintBucket,
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
    <div className="absolute inset-0 bg-neutral-900 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-neutral-700 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft size={20} weight="bold" />
          </button>
          <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
        </div>

        {/* Appearance Section */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-zinc-100 mb-1">Appearance</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Customize your new tab background with wallpapers or solid colors.
          </p>

          {/* Wallpaper Picker */}
          <WallpaperPicker />

          {/* Solid Color Picker */}
          <SolidColorPicker />
        </section>
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

  const handlePresetClick = useCallback((preset: typeof WALLPAPER_PRESETS[0]) => {
    setWallpaper(preset.dataUrl)
  }, [setWallpaper])

  const handleUpload = useCallback(async () => {
    setIsUploading(true)
    try {
      const dataUrl = await window.electronAPI.openImageDialog()
      if (dataUrl) {
        setWallpaper(dataUrl)
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
        <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
          <ImageIcon size={16} />
          Wallpapers
        </label>
        {wallpaperType === 'image' && (
          <button
            onClick={handleClear}
            className="text-xs text-zinc-500 hover:text-zinc-100 flex items-center gap-1 transition-colors"
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
          className="aspect-video rounded-lg border-2 border-dashed border-neutral-800 hover:border-neutral-700
            flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-zinc-400
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
                  ? 'border-blue-500 ring-2 ring-blue-500/25'
                  : 'border-neutral-800 hover:border-neutral-700'
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
                <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
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
      <label className="text-sm font-medium text-zinc-400 flex items-center gap-2 mb-2">
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
                  ? 'border-blue-500 ring-2 ring-blue-500/25 scale-105'
                  : 'border-neutral-800 hover:border-neutral-700 hover:scale-105'
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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">#</span>
          <input
            type="text"
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSubmit() }}
            placeholder="Custom hex color"
            maxLength={6}
            className="w-full pl-7 pr-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800
              text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2
              focus:ring-blue-500/25 focus:border-neutral-700 transition-colors"
          />
        </div>
        <button
          onClick={handleCustomSubmit}
          disabled={!/^[0-9a-fA-F]{6}$/.test(customHex.trim())}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium
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
          <div className="w-10 h-10 rounded-lg border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors overflow-hidden">
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
