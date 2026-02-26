import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { BrowserLayout } from '@/components/layout/BrowserLayout'
import { showToast } from '@/components/ui/Toast'
import { logger } from '@/utils/logger'
import { useThemeStore } from '@/store/themeStore'
import { useSpaceTint } from '@/hooks/useSpaceTint'

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

export default function App(): React.JSX.Element {
  useThemeMode()
  useSpaceTint()
  useGlobalErrorHandlers()
  return (
    <MotionConfig reducedMotion="user">
      <BrowserLayout />
    </MotionConfig>
  )
}
