import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { BrowserLayout } from '@/components/layout/BrowserLayout'
import { showToast } from '@/components/ui/Toast'
import { logger } from '@/utils/logger'
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

function useGlobalErrorHandlers(): void {
  useEffect(() => {
    const onError = (event: ErrorEvent): void => {
      logger.error('[global]', event.error ?? event.message)
      showToast({ message: 'Something went wrong', type: 'error' })
    }
    const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
      logger.error('[unhandledRejection]', event.reason)
      showToast({ message: 'Something went wrong', type: 'error' })
      event.preventDefault()
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])
}

function useGraphicsMode(): void {
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)

  useEffect(() => {
    document.documentElement.dataset.disableMotion = String(disableAnimations)
  }, [disableAnimations])
}

export default function App(): React.JSX.Element {
  useThemeMode()
  useGlobalErrorHandlers()
  useGraphicsMode()
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)

  return (
    <MotionConfig reducedMotion={disableAnimations ? 'always' : 'never'}>
      <BrowserLayout />
    </MotionConfig>
  )
}
