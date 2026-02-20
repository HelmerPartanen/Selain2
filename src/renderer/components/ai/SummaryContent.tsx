// ── SummaryContent ────────────────────────────────────────────────────────────
// Renders real streaming AI output from Ollama. Tokens are received via IPC
// and stored in aiStore. No fake data — this is the actual model response.

import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { LoadingContent } from './LoadingContent'
import { useAIStore } from '@/store/aiStore'
import { CONTENT_HEIGHT } from './constants'

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

// ── Streaming cursor ──────────────────────────────────────────────────────────

function BlinkingCursor(): React.JSX.Element {
  return (
    <motion.span
      className="inline-block w-[2px] h-[12px] ml-[2px] rounded-full"
      style={{ background: 'currentColor', verticalAlign: 'text-bottom' }}
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

// ── Error screen ──────────────────────────────────────────────────────────────

function ErrorContent({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  const summaryError = useAIStore((s) => s.summaryError)
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full text-center px-4">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        ⚠️
      </div>
      <div className="space-y-1">
        <p className="text-[12px] font-medium text-gray-700 dark:text-neutral-300">Summarization failed</p>
        {summaryError && (
          <p className="text-[11px] font-mono text-gray-400 dark:text-neutral-600 break-all max-w-[300px]">{summaryError}</p>
        )}
      </div>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors duration-100"
        style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        Try again
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SummaryContent({
  isLoading,
  loadingDuration,
  onRegenerate,
}: {
  isLoading: boolean
  loadingDuration: number
  onRegenerate: () => void
}): React.JSX.Element {
  const summary = useAIStore((s) => s.summary)
  const isSummarizing = useAIStore((s) => s.isSummarizing)
  const summaryError = useAIStore((s) => s.summaryError)
  const [copied, setCopied] = useState(false)

  const wordCount = summary ? summary.trim().split(/\s+/).length : 0

  const handleCopy = useCallback(() => {
    if (!summary) return
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [summary])

  // Show aurora loading while we haven't received any text yet
  const showLoading = isLoading || (isSummarizing && !summary)
  // Show error if done and failed with no text
  const showError = !showLoading && !!summaryError && !summary

  return (
    <div className="relative" style={{ height: CONTENT_HEIGHT }}>
      <AnimatePresence mode="wait">
        {showLoading ? (
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
        ) : showError ? (
          <motion.div
            key="error"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ErrorContent onRetry={onRegenerate} />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Scrollable streaming text */}
            <div
              className="flex-1 overflow-y-auto glass-scroll pr-1 pb-2"
              role="region"
              aria-label="AI Summary"
              aria-live="polite"
            >
              <p className="text-[13px] leading-[1.75] text-gray-600 dark:text-neutral-400 font-light whitespace-pre-wrap">
                {summary}
                {isSummarizing && <BlinkingCursor />}
              </p>
            </div>

            {/* Action row — only after streaming is done */}
            {!isSummarizing && summary && (
              <motion.div
                className="flex items-center gap-2 pt-3 mt-1 flex-shrink-0"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <span className="text-[11px] text-gray-400 dark:text-neutral-600 tabular-nums">
                  {wordCount} words
                </span>
                <div className="flex-1" />
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-100"
                  aria-label="Regenerate"
                >
                  <RefreshIcon />
                  Regenerate
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-100"
                  aria-label="Copy summary"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.span key="check" className="flex items-center gap-1.5 text-emerald-500"
                        initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.15 }}>
                        <CheckIcon />Copied
                      </motion.span>
                    ) : (
                      <motion.span key="copy" className="flex items-center gap-1.5"
                        initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.15 }}>
                        <CopyIcon />Copy
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
