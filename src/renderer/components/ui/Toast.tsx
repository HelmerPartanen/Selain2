import { memo, useCallback, useEffect, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { dismissToast, getToastsSnapshot, subscribeToToasts, type Toast } from '@/components/ui/toastStore'
import checkSvg from '@/assets/icons/Interface/Check.svg?raw'
import warnSvg from '@/assets/icons/Interface/Warn_Triangle.svg?raw'
import infoSvg from '@/assets/icons/Interface/Warn_Info.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { SPRING } from '@/utils/springs'

const toastIconClass: Record<Toast['type'], string> = {
  success: 'text-[var(--app-success)]',
  error: 'text-[var(--app-danger)]',
  info: 'text-[var(--app-accent)]',
}

function useToasts(): Toast[] {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const listener = (): void => forceUpdate((n) => n + 1)
    return subscribeToToasts(listener)
  }, [])
  return getToastsSnapshot()
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
          <m.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={SPRING}
            className="pointer-events-auto relative overflow-hidden flex items-center gap-3 p-3 rounded-lg bg-[var(--app-bg-primary)]/90 backdrop-blur-sm border border-[var(--app-separator)] text-[var(--app-text-primary)] min-w-[280px] max-w-[400px]"
          >
            {!toast.persistent && (
              <m.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: 'linear' }}
                className={`absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-current opacity-15 ${toastIconClass[toast.type]}`}
              />
            )}
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
              <SvgIcon
                svg={toast.type === 'error' ? warnSvg : toast.type === 'info' ? infoSvg : checkSvg}
                size={24}
                className={toastIconClass[toast.type]}
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
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--app-text-tertiary)] hover:text-[var(--app-text-primary)] flex-shrink-0"
              aria-label="Dismiss notification"
            >
              <SvgIcon svg={closeSvg} size={10} />
            </Button>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export const ToastContainer = memo(ToastContainerInner)
