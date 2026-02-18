// ─── useIsDark ───────────────────────────────────────────────────────────────
// Reactive boolean that resolves the effective dark/light state.
// Handles 'dark', 'light', and 'system' theme modes with OS media-query
// listener for real-time updates.

import { useEffect, useState } from 'react'
import { useThemeStore } from '@/store/themeStore'

export function useIsDark(): boolean {
  const themeMode = useThemeStore((s) => s.themeMode)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    if (themeMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemDark(mq.matches)
    const handler = (e: MediaQueryListEvent): void => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [themeMode])

  if (themeMode === 'dark') return true
  if (themeMode === 'light') return false
  return systemDark
}
