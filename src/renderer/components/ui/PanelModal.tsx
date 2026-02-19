// \u2500\u2500\u2500 PanelModal \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Shared structural shell for all modal panels (Bookmarks, History,
// Downloads, Settings). Provides: frosted glass surface, backdrop blur,
// genie-entrance animation, and Escape key dismissal.
//
// Z-index contract:
//   z-[80]  \u2014 dimmed backdrop
//   z-[85]  \u2014 panel surface (sits above backdrop, below toasts at z-[200])

import { motion } from 'motion/react'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { SPRING } from '@/utils/springs'

// Shared genie-motion values \u2014 single source of truth for all panels
const PANEL_INITIAL = { y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -20, filter: 'blur(8px)' } as const
const PANEL_ANIMATE = { y: 0, scaleX: 1, scaleY: 1, opacity: 1, rotateX: 0, filter: 'blur(0px)' } as const
const PANEL_EXIT    = { y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -14, filter: 'blur(6px)' } as const
const PANEL_TRANSITION = { ...SPRING, damping: 26 } as const

interface PanelModalProps {
  onClose: () => void
  width: string
  height: string
  /** Extra classes applied to the panel surface */
  className?: string
  /** Passed through to the motion.div for ARIA semantics */
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
  useEscapeKey(onClose)

  return (
    <>
      {/* Dimmed backdrop \u2014 click-away closes the panel */}
      <motion.div
        className="fixed inset-0 z-[80] bg-black/40 dark:bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onMouseDown={onClose}
        aria-hidden="true"
      />

      {/* Centering wrapper \u2014 pointer-events disabled so backdrop click-away works */}
      <div className="fixed inset-0 z-[85] flex items-center justify-center pointer-events-none">
        <motion.div
          role={role}
          aria-modal={aria['aria-modal']}
          aria-label={aria['aria-label']}
          className={`rounded-3xl overflow-hidden glass-heavy [app-region:no-drag] pointer-events-auto ${className}`}
          style={{ width, height, transformOrigin: '50% 100%', perspective: 800 }}
          initial={PANEL_INITIAL}
          animate={PANEL_ANIMATE}
          exit={PANEL_EXIT}
          transition={PANEL_TRANSITION}
        >
          {children}
        </motion.div>
      </div>
    </>
  )
}
