import { motion } from 'motion/react'
import { CONTENT_HEIGHT } from './constants'
import { useSettingsStore } from '@/store/settingsStore'

export function LoadingContent({ duration: _duration }: { duration: number }): React.JSX.Element {
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)

  return (
    <div className="flex items-center justify-center" style={{ height: CONTENT_HEIGHT }}>
      <div className="relative h-[118px] w-[176px]">
        <div className="absolute left-0 top-0 h-[118px] w-[88px] rounded-[7px] border border-[var(--app-separator)] bg-[var(--app-bg-tertiary)] shadow-sm">
          <div className="absolute left-3 right-3 top-3 h-2 rounded-full bg-[var(--app-text-tertiary)]" />
          <div className="absolute left-3 right-5 top-7 h-1.5 rounded-full bg-[var(--app-text-quaternary)]" />
          <div className="absolute left-3 right-3 top-12 space-y-2.5">
            {[0, 1, 2, 3].map((line) => (
              <motion.div
                key={line}
                className="h-1.5 origin-left rounded-full bg-[var(--app-text-quaternary)]"
                style={{ width: `${line % 2 === 0 ? 100 : 74}%` }}
                animate={disableAnimations ? undefined : { opacity: [0.28, 0.7, 0.28] }}
                transition={{ duration: 1.25, repeat: Infinity, delay: line * 0.1 }}
              />
            ))}
          </div>
          <motion.div
            className="absolute left-2 right-2 h-6 rounded-[5px] border border-[var(--app-accent)] bg-[var(--app-control-active)]"
            animate={disableAnimations ? { y: 42 } : { y: [22, 82, 22] }}
            transition={{ duration: 1.45, repeat: Infinity, ease: [0.45, 0, 0.2, 1] }}
          />
        </div>

        <div className="absolute right-0 top-[26px] h-[68px] w-[70px] rounded-[7px] border border-[var(--app-separator)] bg-[var(--app-bg-tertiary)] shadow-sm">
          <div className="absolute left-3 right-3 top-3 h-2 rounded-full bg-[var(--app-accent)]" />
          <div className="absolute left-3 right-4 top-8 space-y-2.5">
            {[0, 1, 2].map((line) => (
              <motion.div
                key={line}
                className="h-1.5 origin-left rounded-full bg-[var(--app-text-quaternary)]"
                style={{ width: `${line === 1 ? 68 : 100}%` }}
                animate={disableAnimations ? undefined : { scaleX: [0.45, 1, 0.45], opacity: [0.32, 0.88, 0.32] }}
                transition={{ duration: 1.45, repeat: Infinity, delay: line * 0.14, ease: [0.45, 0, 0.2, 1] }}
              />
            ))}
          </div>
        </div>

        {[0, 1, 2].map((dot) => (
          <motion.div
            key={dot}
            className="absolute top-[55px] h-1.5 w-1.5 rounded-full bg-[var(--app-accent)]"
            initial={{ x: 82, y: dot * 10 - 10, opacity: 0 }}
            animate={
              disableAnimations
                ? { x: 101, y: dot * 10 - 10, opacity: 0.6 }
                : { x: [82, 112, 101], y: [dot * 10 - 10, dot * 6 - 6, dot * 10 - 10], opacity: [0, 0.9, 0] }
            }
            transition={{ duration: 1.45, repeat: Infinity, delay: dot * 0.14, ease: [0.45, 0, 0.2, 1] }}
          />
        ))}
      </div>
    </div>
  )
}
