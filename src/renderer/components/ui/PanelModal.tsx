// \u2500\u2500\u2500 PanelModal \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Shared structural shell for all modal panels (Bookmarks, History,
// Downloads, Settings). Provides: solid panel surface, entrance animation,
// and Escape key dismissal.
//
// Z-index contract:
//   z-[80]  \u2014 dimmed backdrop
//   z-[85]  \u2014 panel surface (sits above backdrop, below toasts at z-[200])

import { m } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { SPRING } from '@/utils/springs'

// Shared genie-motion values \u2014 single source of truth for all panels
const PANEL_INITIAL = { y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -20 } as const
const PANEL_ANIMATE = { y: 0, scaleX: 1, scaleY: 1, opacity: 1, rotateX: 0 } as const
const PANEL_EXIT    = { y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -14 } as const
const PANEL_TRANSITION = { ...SPRING, damping: 26 } as const

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

const modalStack: string[] = []

function isTopmostModal(id: string): boolean {
  return modalStack[modalStack.length - 1] === id
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true')
}

interface PanelModalProps {
  onClose: () => void
  width: string
  height: string
  /** Extra classes applied to the panel surface */
  className?: string
  /** Passed through to the m.div for ARIA semantics */
  role?: string
  'aria-label'?: string
  'aria-modal'?: boolean
  children: React.ReactNode
}

export function PanelModal({
  onClose,
  width,
  height,
  className = '',
  role,
  children,
  ...aria
}: PanelModalProps): React.JSX.Element {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const modalIdRef = useRef(`modal-${Math.random().toString(36).slice(2, 10)}`)
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)

  useEffect(() => {
    const modalId = modalIdRef.current
    modalStack.push(modalId)

    const panel = panelRef.current
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusFrame = window.requestAnimationFrame(() => {
      if (!panel) return
      const focusable = getFocusableElements(panel)
      if (focusable.length > 0) {
        focusable[0]!.focus()
      } else {
        panel.focus()
      }
    })

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!isTopmostModal(modalId)) return

      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }

      if (e.key !== 'Tab') return
      const root = panelRef.current
      if (!root) return

      const focusable = getFocusableElements(root)
      if (focusable.length === 0) {
        e.preventDefault()
        root.focus()
        return
      }

      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null

      if (e.shiftKey) {
        if (!active || active === first || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (!active || active === last || !root.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown, true)

      const idx = modalStack.lastIndexOf(modalId)
      if (idx >= 0) modalStack.splice(idx, 1)

      const previous = previousFocusRef.current
      if (previous && document.contains(previous)) {
        previous.focus()
      }
    }
  }, [onClose])

  return (
    <>
      {/* Centering wrapper \u2014 pointer-events disabled so backdrop click-away works */}
      <div className="fixed inset-0 z-[85] flex items-center justify-center pointer-events-none">
        <m.div
          ref={panelRef}
          role={role}
          aria-modal={aria['aria-modal']}
          aria-label={aria['aria-label']}
          tabIndex={-1}
          className={`rounded-xl overflow-hidden bg-[var(--app-bg-primary)] border border-[var(--app-separator)] text-[var(--app-text-primary)] [app-region:no-drag] pointer-events-auto ${className}`}
          style={{ width, height, transformOrigin: '50% 100%', perspective: 800 }}
          initial={disableAnimations ? undefined : PANEL_INITIAL}
          animate={PANEL_ANIMATE}
          exit={disableAnimations ? undefined : PANEL_EXIT}
          transition={disableAnimations ? { duration: 0 } : PANEL_TRANSITION}
        >
          {children}
        </m.div>
      </div>
    </>
  )
}
