import { memo, useEffect } from 'react'
import { motion } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import keyboardSvg from '@/assets/icons/Keyboard/Keyboard.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useUIStore } from '@/store/uiStore'

const springPanel = { type: 'spring' as const, stiffness: 400, damping: 28, mass: 0.8 }

// ─── Shortcut data ───────────────────────────────────────────────────────────

interface Shortcut {
  keys: string
  description: string
}

interface ShortcutGroup {
  label: string
  shortcuts: Shortcut[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: 'Tabs',
    shortcuts: [
      { keys: 'Ctrl + T', description: 'New tab' },
      { keys: 'Ctrl + W', description: 'Close current tab' },
      { keys: 'Ctrl + Shift + T', description: 'Reopen last closed tab' },
      { keys: 'Ctrl + Tab', description: 'Next tab' },
      { keys: 'Ctrl + Shift + Tab', description: 'Previous tab' },
      { keys: 'Ctrl + 1–9', description: 'Switch to tab 1–9' },
      { keys: 'Ctrl + Shift + A', description: 'Tab overview' },
      { keys: 'Ctrl + Shift + S', description: 'Toggle split view' }
    ]
  },
  {
    label: 'Navigation',
    shortcuts: [
      { keys: 'Ctrl + L', description: 'Focus URL bar' },
      { keys: 'Ctrl + R', description: 'Reload page' },
      { keys: 'F5', description: 'Reload page' },
      { keys: 'Alt + ←', description: 'Go back' },
      { keys: 'Alt + →', description: 'Go forward' }
    ]
  },
  {
    label: 'Tools',
    shortcuts: [
      { keys: 'Ctrl + F', description: 'Find in page' },
      { keys: 'Escape', description: 'Close find bar / panels' }
    ]
  }
]

// ─── Key badge renderer ──────────────────────────────────────────────────────

function KeyBadge({ label }: { label: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-1.5 rounded-md bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 leading-none">
      {label}
    </span>
  )
}

function KeyCombo({ keys }: { keys: string }): React.JSX.Element {
  const parts = keys.split(' + ')
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-[10px] text-gray-300 dark:text-neutral-600">+</span>}
          <KeyBadge label={part} />
        </span>
      ))}
    </div>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

function HotkeysPanelInner(): React.JSX.Element {
  const closeHotkeys = useUIStore((s) => s.closeHotkeys)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeHotkeys()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [closeHotkeys])

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[80] bg-black/30 dark:bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onMouseDown={closeHotkeys}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-[85] flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-[480px] h-[440px] rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-2xl border border-gray-200/80 dark:border-neutral-700 [app-region:no-drag] pointer-events-auto flex flex-col"
          style={{ transformOrigin: '50% 100%', perspective: 800 }}
          initial={{ y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -20 }}
          animate={{ y: 0, scaleX: 1, scaleY: 1, opacity: 1, rotateX: 0 }}
          exit={{ y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -14 }}
          transition={{ ...springPanel, damping: 26 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0">
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <SvgIcon svg={keyboardSvg} size={16} />
              Keyboard Shortcuts
            </h2>
            <button
              onClick={closeHotkeys}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-150"
            >
              <SvgIcon svg={closeSvg} size={13} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
            <div className="space-y-5">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.label}>
                  <h3 className="text-[11px] font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-2.5">
                    {group.label}
                  </h3>
                  <div className="space-y-0.5">
                    {group.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.keys}
                        className="flex items-center justify-between gap-4 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors duration-100"
                      >
                        <span className="text-[13px] text-gray-700 dark:text-neutral-300">
                          {shortcut.description}
                        </span>
                        <KeyCombo keys={shortcut.keys} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

export const HotkeysPanel = memo(HotkeysPanelInner)
