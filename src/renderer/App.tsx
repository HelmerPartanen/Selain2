import { useEffect } from 'react'
import { BrowserLayout } from '@/components/layout/BrowserLayout'
import { useThemeStore } from '@/store/themeStore'

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

export default function App(): React.JSX.Element {
  useThemeMode()
  return <BrowserLayout />
}
