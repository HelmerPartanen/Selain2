import { memo, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { SvgIcon } from '@/components/ui/SvgIcon'
import checkSvg from '@/assets/icons/Interface/Check.svg?raw'
import warnSvg from '@/assets/icons/Interface/Warn_Triangle.svg?raw'
import infoSvg from '@/assets/icons/Interface/Warn_Info.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { SPRING } from '@/utils/springs'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'info' | 'error'
  action?: { label: string; onClick: () => void }
}

// Simple external store for toasts (avoids prop drilling)
let toasts: Toast[] = []
let listeners: Array<() => void> = []

function notify(): void {
  for (const l of listeners) l()
}

export function showToast(toast: Omit<Toast, 'id'>): void {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  toasts = [...toasts, { ...toast, id }]
  notify()
  // Auto-dismiss after 5s
  setTimeout(() => {
    dismissToast(id)
  }, 5000)
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

function useToasts(): Toast[] {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const listener = (): void => forceUpdate((n) => n + 1)
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])
  return toasts
}

function ToastContainerInner(): React.JSX.Element {
  const items = useToasts()

  const handleDismiss = useCallback((id: string) => {
    dismissToast(id)
  }, [])

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {items.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={SPRING}
            className="pointer-events-auto relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)] text-[var(--app-text-primary)] min-w-[280px] max-w-[400px]"
          >
            {/* Auto-dismiss progress strip */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5, ease: 'linear' }}
              className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-current opacity-15"
              style={{ color: toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : '#6366f1' }}
            />
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${toast.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                toast.type === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                  'bg-blue-100 dark:bg-blue-900/30'
              }`}>
              <SvgIcon
                svg={toast.type === 'error' ? warnSvg : toast.type === 'info' ? infoSvg : checkSvg}
                size={12}
                className={
                  toast.type === 'success' ? 'text-green-500' :
                    toast.type === 'error' ? 'text-red-500' :
                      'text-blue-500'
                }
              />
            </div>
            <Text as="span" size="body" tone="secondary" className="line-clamp-3 flex-1 break-words">
              {toast.message}
            </Text>
            {toast.action && (
              <Button
                variant="link"
                size="xs"
                onClick={() => {
                  toast.action!.onClick()
                  handleDismiss(toast.id)
                }}
                className="flex-shrink-0"
              >
                {toast.action.label}
              </Button>
            )}
            <Button
              variant="icon"
              size="none"
              rounded="rounded-full"
              onClick={() => handleDismiss(toast.id)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white flex-shrink-0 transition-colors"
              aria-label="Dismiss notification"
            >
              <SvgIcon svg={closeSvg} size={10} />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export const ToastContainer = memo(ToastContainerInner)
