import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { LoadingContent } from './LoadingContent'
import { CONTENT_HEIGHT, FAKE_SUMMARY, WORD_COUNT } from './constants'

// ── Inline micro-icons ────────────────────────────────────────────────────────

const CopyIcon = (): React.JSX.Element => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const CheckIcon = (): React.JSX.Element => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const RefreshIcon = (): React.JSX.Element => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

// ── Streaming text line ───────────────────────────────────────────────────────

function StreamingTextLine({ text, delayBase }: { text: string; delayBase: number }): React.JSX.Element {
  const words = text.split(' ')
  return (
    <p
      className="text-[13px] leading-[1.7] text-gray-600 dark:text-neutral-400 font-light"
      aria-label={text}
    >
      {words.map((word, i) => {
        const t = i / words.length
        const stagger = 0.028 + t * 0.04
        return (
          <motion.span
            key={i}
            className="inline-block mr-[0.3em]"
            initial={{ opacity: 0, y: 5, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.22, delay: delayBase + i * stagger, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.span>
        )
      })}
    </p>
  )
}

// ── Summary content ───────────────────────────────────────────────────────────

export function SummaryContent({
  isLoading,
  loadingDuration,
  onRegenerate,
}: {
  isLoading: boolean
  loadingDuration: number
  onRegenerate: () => void
}): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(FAKE_SUMMARY.join('\n\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  return (
    <div className="relative" style={{ height: CONTENT_HEIGHT }}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97, filter: 'blur(6px)' }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <LoadingContent duration={loadingDuration} />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
          >
            {/* Scrollable text */}
            <div
              className="flex-1 overflow-y-auto glass-scroll space-y-[14px] pr-1 pb-2"
              role="region"
              aria-label="AI Summary"
              aria-live="polite"
            >
              {FAKE_SUMMARY.map((line, i) => (
                <StreamingTextLine key={i} text={line} delayBase={i * 0.32} />
              ))}
            </div>

            {/* Action row */}
            <motion.div
              className="flex items-center gap-2 pt-3 mt-1 flex-shrink-0"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <span className="text-[11px] text-gray-400 dark:text-neutral-600 tabular-nums">
                {WORD_COUNT} words
              </span>
              <div className="flex-1" />
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-100"
                aria-label="Regenerate summary"
              >
                <RefreshIcon />
                Regenerate
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-100"
                aria-label="Copy summary to clipboard"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="check"
                      className="flex items-center gap-1.5 text-emerald-500"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <CheckIcon />
                      Copied
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      className="flex items-center gap-1.5"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <CopyIcon />
                      Copy
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
