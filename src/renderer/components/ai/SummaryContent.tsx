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

// ── Lightweight markdown renderer ───────────────────────────────────────────────
// Handles: **bold**, *italic*, `code`, # headings, - / * / 1. lists, blank lines.
// Designed to work gracefully on partial/streaming text.

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // Match **bold**, *italic*, `code` — in that order of precedence
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={k++} className="font-semibold text-gray-800 dark:text-neutral-200">
          {m[1]}
        </strong>
      )
    } else if (m[2] !== undefined) {
      nodes.push(<em key={k++}>{m[2]}</em>)
    } else if (m[3] !== undefined) {
      nodes.push(
        <code
          key={k++}
          className="font-mono text-[11.5px] px-1 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] text-gray-700 dark:text-neutral-300"
        >
          {m[3]}
        </code>
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

type Block =
  | { kind: 'h1' | 'h2' | 'h3'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'p'; text: string }
  | { kind: 'gap' }

function parseBlocks(raw: string): Block[] {
  const blocks: Block[] = []
  let listKind: 'ul' | 'ol' | null = null
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length && listKind) {
      blocks.push({ kind: listKind, items: [...listItems] })
      listItems = []
      listKind = null
    }
  }

  for (const rawLine of raw.split('\n')) {
    const line = rawLine
    const mH3 = line.match(/^###\s+(.*)/)
    const mH2 = line.match(/^##\s+(.*)/)
    const mH1 = line.match(/^#\s+(.*)/)
    const mUL = line.match(/^[\t ]*[-*]\s+(.*)/)
    const mOL = line.match(/^[\t ]*\d+\.\s+(.*)/)

    if (mH1 || mH2 || mH3) {
      flushList()
      const t = mH3?.[1] ?? mH2?.[1] ?? mH1?.[1] ?? ''
      blocks.push({ kind: mH3 ? 'h3' : mH2 ? 'h2' : 'h1', text: t as string })
    } else if (mUL) {
      if (listKind !== 'ul') { flushList(); listKind = 'ul' }
      listItems.push(mUL[1]!)
    } else if (mOL) {
      if (listKind !== 'ol') { flushList(); listKind = 'ol' }
      listItems.push(mOL[1]!)
    } else if (line.trim() === '') {
      flushList()
      if (blocks.length > 0) {
        const last = blocks[blocks.length - 1]
        if (last && last.kind !== 'gap') blocks.push({ kind: 'gap' })
      }
    } else {
      flushList()
      blocks.push({ kind: 'p', text: line })
    }
  }
  flushList()
  return blocks
}

function MarkdownBody({ text }: { text: string }): React.JSX.Element {
  const blocks = parseBlocks(text)
  return (
    <div className="space-y-[6px]">
      {blocks.map((block, i) => {
        if (block.kind === 'gap') return <div key={i} className="h-1" />
        if (block.kind === 'h1') return (
          <h1 key={i} className="text-[14px] font-semibold text-gray-900 dark:text-white leading-snug mt-2">
            {parseInline(block.text)}
          </h1>
        )
        if (block.kind === 'h2') return (
          <h2 key={i} className="text-[13px] font-semibold text-gray-800 dark:text-neutral-200 leading-snug mt-1.5">
            {parseInline(block.text)}
          </h2>
        )
        if (block.kind === 'h3') return (
          <h3 key={i} className="text-[12px] font-semibold text-gray-700 dark:text-neutral-300 leading-snug mt-1">
            {parseInline(block.text)}
          </h3>
        )
        if (block.kind === 'ul') return (
          <ul key={i} className="space-y-[3px] pl-3">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2 text-[13px] leading-[1.7] text-gray-600 dark:text-neutral-400 font-light">
                <span className="mt-[6px] w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: 'currentColor', opacity: 0.45 }} />
                <span>{parseInline(item)}</span>
              </li>
            ))}
          </ul>
        )
        if (block.kind === 'ol') return (
          <ol key={i} className="space-y-[3px] pl-3">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2 text-[13px] leading-[1.7] text-gray-600 dark:text-neutral-400 font-light">
                <span className="flex-shrink-0 text-[11px] font-medium text-gray-400 dark:text-neutral-600 tabular-nums mt-[2px]">
                  {j + 1}.
                </span>
                <span>{parseInline(item)}</span>
              </li>
            ))}
          </ol>
        )
        // paragraph
        return (
          <p key={i} className="text-[13px] leading-[1.75] text-gray-600 dark:text-neutral-400 font-light">
            {parseInline((block as { kind: 'p'; text: string }).text)}
          </p>
        )
      })}
    </div>
  )
}

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
              <MarkdownBody text={summary} />
              {isSummarizing && (
                <span className="inline-flex items-center mt-0.5 ml-0.5">
                  <BlinkingCursor />
                </span>
              )}
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
