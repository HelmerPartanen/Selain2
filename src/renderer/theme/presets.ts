export interface SolidColorPreset {
  name: string
  hex: string
}

const SOLID_COLOR_PREFIX = 'color:'

export const SOLID_COLOR_PRESETS: SolidColorPreset[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'Graphite', hex: '#333333' },
  { name: 'Slate', hex: '#708090' },
  { name: 'Navy', hex: '#191970' },
  { name: 'Forest', hex: '#2e4a35' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Soft gray', hex: '#f5f5f5' },
  { name: 'Lavender', hex: '#e6e6fa' },
  { name: 'Pink', hex: '#ffd1dc' },
  { name: 'Warm beige', hex: '#f5f5dc' },
]

export function solidColorToWallpaperValue(hex: string): string {
  return `${SOLID_COLOR_PREFIX}${hex}`
}

export function wallpaperValueToSolidColor(value: string | null): string | null {
  if (!value?.startsWith(SOLID_COLOR_PREFIX)) return null
  const hex = value.slice(SOLID_COLOR_PREFIX.length)
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : null
}
