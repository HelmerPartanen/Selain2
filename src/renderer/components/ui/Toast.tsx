import { memo, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import checkSvg from '@/assets/icons/Interface/Check.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'

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

const springToast = { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.8 }

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
            transition={springToast}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-neutral-900 shadow-xl border border-gray-200 dark:border-neutral-700 min-w-[280px] max-w-[380px]"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              toast.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
              toast.type === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
              'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              <SvgIcon
                svg={checkSvg}
                size={12}
                className={
                  toast.type === 'success' ? 'text-green-500' :
                  toast.type === 'error' ? 'text-red-500' :
                  'text-blue-500'
                }
              />
            </div>
            <span className="flex-1 text-[13px] font-medium text-gray-800 dark:text-neutral-200 truncate">
              {toast.message}
            </span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick()
                  handleDismiss(toast.id)
                }}
                className="text-[12px] font-semibold text-blue-500 hover:text-blue-600 flex-shrink-0 transition-colors"
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={() => handleDismiss(toast.id)}
              className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white flex-shrink-0 transition-colors"
            >
              <SvgIcon svg={closeSvg} size={10} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export const ToastContainer = memo(ToastContainerInner)
