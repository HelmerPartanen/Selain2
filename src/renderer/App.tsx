import { useEffect } from 'react'
import { BrowserLayout } from '@/components/layout/BrowserLayout'
import { useThemeStore } from '@/store/themeStore'
import { useSettingsStore } from '@/store/settingsStore'

function useThemeMode(): void {
  const themeMode = useThemeStore((s) => s.themeMode)

  useEffect(() => {
    const apply = (resolved: 'dark' | 'light'): void => {
      document.documentElement.setAttribute('data-theme', resolved)
      document.documentElement.classList.toggle('dark', resolved === 'dark')
    }

    if (themeMode !== 'system') {
      apply(themeMode)
      return
    }

    // System mode — listen for OS preference changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    apply(mq.matches ? 'dark' : 'light')

    const handler = (e: MediaQueryListEvent): void => apply(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [themeMode])
}

function useReduceTransparency(): void {
  const reduceTransparency = useSettingsStore((s) => s.reduceTransparency)
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-transparency', reduceTransparency)
  }, [reduceTransparency])
}

export default function App(): React.JSX.Element {
  useThemeMode()
  useReduceTransparency()
  return <BrowserLayout />
}
