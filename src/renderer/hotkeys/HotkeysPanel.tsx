import { memo, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import keyboardSvg from '@/assets/icons/Keyboard/Keyboard.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import { useUIStore } from '@/store/uiStore'
import { SPRING, SPRING_SNAPPY, SPRING_LIST } from '@/utils/springs'

const ShortcutRow = memo(function ShortcutRow({
  description,
  keys,
  index
}: {
  description: string
  keys: string
  index: number
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_LIST, delay: index * 0.02 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="relative flex items-center justify-between gap-4 px-3 py-1.5 rounded-full hover:scale-105 transition-all duration-150"
    >
      {hovered && (
        <motion.div
          layoutId="history-hover"
          className="absolute inset-0 rounded-full glass bg-white/20 dark:bg-white/6 shadow ring-1 ring-black/5 dark:ring-white/10"
          initial={{ opacity: 0.5, filter: 'blur(2px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(2px)' }}
          transition={SPRING_SNAPPY}
        />
      )}
      <span className="relative text-[13px] text-gray-700 dark:text-neutral-300 z-10">{description}</span>
      <div className="relative z-10">
        <KeyCombo keys={keys} />
      </div>
    </motion.div>
  )
})

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
      { keys: 'Ctrl + Shift + S', description: 'Toggle split view' },
      { keys: 'Ctrl + Shift + X', description: 'Swap split panels' }
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
    <span className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-1.5 rounded-md glass border border-gray-200 dark:border-neutral-700 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 leading-none">
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
          className="w-[480px] h-[440px] rounded-3xl overflow-hidden glass-heavy [app-region:no-drag] pointer-events-auto flex flex-col"
          style={{ transformOrigin: '50% 100%', perspective: 800 }}
          initial={{ y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -20 }}
          animate={{ y: 0, scaleX: 1, scaleY: 1, opacity: 1, rotateX: 0 }}
          exit={{ y: 280, scaleX: 0.1, scaleY: 0.03, opacity: 0, rotateX: -14 }}
          transition={{ ...SPRING, damping: 26 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 className="text-[15px] font-medium text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <SvgIcon svg={keyboardSvg} size={16} />
              Keyboard Shortcuts
            </h2>
            <button
              onClick={closeHotkeys}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150"
            >
              <SvgIcon svg={closeSvg} size={13} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 glass-scroll">
            <div className="space-y-5">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.label}>
                  <h3 className="text-[11px] font-semibold text-gray-400 dark:text-neutral-500 uppercase tracking-wider mb-2.5">
                    {group.label}
                  </h3>
                  <div className="space-y-0.5">
                    {group.shortcuts.map((shortcut, idx) => (
                      <ShortcutRow
                        key={shortcut.keys}
                        description={shortcut.description}
                        keys={shortcut.keys}
                        index={idx}
                      />
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
