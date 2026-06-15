// ── SummaryContent ────────────────────────────────────────────────────────────
// Renders real streaming AI output from Ollama. Tokens are received via IPC
// and stored in aiStore. No fake data — this is the actual model response.

import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import clockSvg from '@/assets/icons/Time/Clock.svg?raw'
import { LoadingContent } from './LoadingContent'
import { useAIStore } from '@/store/aiStore'


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

// ── Inline markdown parser ───────────────────────────────────────────────────────
// Handles: **bold**, *italic*, `code` — graceful on streaming text.

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
          className="font-mono text-[14px] px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.08] text-gray-700 dark:text-neutral-300"
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

// ── Extract key points from summary ──────────────────────────────────────────────
// Finds bullet/numbered list items as key points

function extractKeyPoints(text: string): string[] {
  const keyPoints: string[] = []
  for (const line of text.split('\n')) {
    const mUL = line.match(/^[\t ]*[-*]\s+(.+)/)
    const mOL = line.match(/^[\t ]*\d+\.\s+(.+)/)
    if (mUL?.[1] || mOL?.[1]) {
      const point = (mUL?.[1] ?? mOL?.[1] ?? '').trim()
      if (point.length > 0) keyPoints.push(point)
    }
  }
  return keyPoints.slice(0, 5) // Max 5 key points
}

type Block =
  | { kind: 'h1' | 'h2' | 'h3'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'blockquote'; text: string }
  | { kind: 'codeblock'; code: string; lang?: string }
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

  const lines = raw.split('\n')
  let i = 0

  while (i < lines.length) {
    const rawLine = lines[i] || ''
    const line = rawLine
    const mH3 = line.match(/^###\s+(.*)/)
    const mH2 = line.match(/^##\s+(.*)/)
    const mH1 = line.match(/^#\s+(.*)/)
    const mUL = line.match(/^[\t ]*[-*]\s+(.*)/)
    const mOL = line.match(/^[\t ]*\d+\.\s+(.*)/)
    const mBQ = line.match(/^>\s+(.*)/)
    const mCB = line.match(/^```(\w*)/)

    if (mH1 || mH2 || mH3) {
      flushList()
      const t = mH3?.[1] ?? mH2?.[1] ?? mH1?.[1] ?? ''
      blocks.push({ kind: mH3 ? 'h3' : mH2 ? 'h2' : 'h1', text: t as string })
    } else if (mCB) {
      flushList()
      const lang = mCB[1] || ''
      let code = ''
      i++
      while (i < lines.length && !(lines[i] || '').match(/^```/)) {
        code += (code ? '\n' : '') + (lines[i] || '')
        i++
      }
      blocks.push({ kind: 'codeblock', code, lang })
      i++
      continue
    } else if (mBQ) {
      flushList()
      let bqText = mBQ[1] ?? ''
      i++
      while (i < lines.length && (lines[i] || '').match(/^>\s+(.*)/)) {
        const m = (lines[i] || '').match(/^>\s+(.*)/)
        bqText += '\n' + (m?.[1] ?? '')
        i++
      }
      blocks.push({ kind: 'blockquote', text: bqText })
      continue
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
    i++
  }
  flushList()
  return blocks
}

function MarkdownBody({ text }: { text: string }): React.JSX.Element {
  const blocks = parseBlocks(text)
  return (
    <motion.div
      className="space-y-[8px]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {blocks.map((block, i) => {
        if (block.kind === 'gap') {
          return (
            <motion.div
              key={i}
              className="h-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, delay: i * 0.01 }}
            />
          )
        }
        if (block.kind === 'h1') {
          return (
            <motion.h1
              key={i}
              className="text-[32px] font-bold text-gray-900 dark:text-white leading-tight mt-3 mb-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.015, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {parseInline(block.text)}
            </motion.h1>
          )
        }
        if (block.kind === 'h2') {
          return (
            <motion.h2
              key={i}
              className="text-[24px] font-semibold text-gray-800 dark:text-neutral-150 leading-snug mt-2.5 mb-1"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.015, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {parseInline(block.text)}
            </motion.h2>
          )
        }
        if (block.kind === 'h3') {
          return (
            <motion.h3
              key={i}
              className="text-[18px] font-semibold text-gray-700 dark:text-neutral-300 leading-snug mt-2 mb-0.5"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.015, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {parseInline(block.text)}
            </motion.h3>
          )
        }
        if (block.kind === 'blockquote') {
          return (
            <motion.blockquote
              key={i}
              className="border-l-3 border-blue-400 dark:border-blue-500 pl-4 py-1 italic text-gray-600 dark:text-neutral-400 bg-blue-50 dark:bg-blue-950/20 rounded-r px-3"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.015 }}
            >
              {parseInline(block.text)}
            </motion.blockquote>
          )
        }
        if (block.kind === 'codeblock') {
          return (
            <motion.pre
              key={i}
              className="bg-gray-900 dark:bg-[#0f1419] border border-gray-700 dark:border-gray-800 rounded-lg p-3 overflow-x-auto text-[13px] font-mono"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.015 }}
            >
              <code className="text-gray-300 dark:text-gray-400 leading-relaxed whitespace-pre-wrap break-words">
                {block.code}
              </code>
            </motion.pre>
          )
        }
        if (block.kind === 'ul') {
          return (
            <motion.ul
              key={i}
              className="space-y-[4px] pl-0"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.015, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {block.items.map((item, j) => (
                <motion.li
                  key={j}
                  className="flex gap-3 text-[16px] leading-relaxed text-gray-600 dark:text-neutral-400"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: (i + j) * 0.008 }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2" style={{ background: 'currentColor', opacity: 0.6 }} />
                  <span>{parseInline(item)}</span>
                </motion.li>
              ))}
            </motion.ul>
          )
        }
        if (block.kind === 'ol') {
          return (
            <motion.ol
              key={i}
              className="space-y-[4px] pl-0"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.015, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {block.items.map((item, j) => (
                <motion.li
                  key={j}
                  className="flex gap-3 text-[16px] leading-relaxed text-gray-600 dark:text-neutral-400"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: (i + j) * 0.008 }}
                >
                  <span className="flex-shrink-0 text-[14px] font-medium text-gray-400 dark:text-neutral-600 tabular-nums w-5 text-right">
                    {j + 1}.
                  </span>
                  <span>{parseInline(item)}</span>
                </motion.li>
              ))}
            </motion.ol>
          )
        }
        return (
          <motion.p
            key={i}
            className="text-[16px] leading-[1.8] text-gray-600 dark:text-neutral-400"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.015, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {parseInline((block as { kind: 'p'; text: string }).text)}
          </motion.p>
        )
      })}
    </motion.div>
  )
}

// ── Streaming cursor ──────────────────────────────────────────────────────────

function BlinkingCursor(): React.JSX.Element {
  return (
    <motion.span
      className="inline-block w-[2px] h-[14px] ml-[2px] rounded-full"
      style={{ background: 'currentColor', verticalAlign: 'text-bottom' }}
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

// ── Error screen ──────────────────────────────────────────────────────────────

function ErrorContent(): React.JSX.Element {
  const summaryError = useAIStore((s) => s.summaryError)
  const errorMessages: { [key: string]: string } = {
    'Connection refused': 'Ollama service is not running. Please start Ollama and try again.',
    'No such file': 'Ollama model not found. The model may need to be downloaded.',
    'ENOENT': 'Ollama installation not found. Please install Ollama first.',
    'timeout': 'Request timed out. Try again in a moment.',
  }
  
  let friendlyMessage = 'Something went wrong while summarizing this page.'
  for (const [key, msg] of Object.entries(errorMessages)) {
    if (summaryError?.includes(key)) {
      friendlyMessage = msg
      break
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full text-center px-4">
      <motion.div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-semibold"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        ⚠️
      </motion.div>
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <p className="text-[13px] font-medium text-gray-700 dark:text-neutral-300">Summarization failed</p>
        <p className="text-[12px] text-gray-500 dark:text-neutral-500 max-w-[320px]">{friendlyMessage}</p>
        {summaryError && (
          <p className="text-[10px] font-mono text-gray-400 dark:text-neutral-600 break-all max-w-[300px] mt-2 opacity-60">
            {summaryError.slice(0, 120)}
          </p>
        )}
      </motion.div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function SummaryContent({
  isLoading,
  loadingDuration,
}: {
  isLoading: boolean
  loadingDuration: number
}): React.JSX.Element {
  const summary = useAIStore((s) => s.summary)
  const isSummarizing = useAIStore((s) => s.isSummarizing)
  const summaryError = useAIStore((s) => s.summaryError)

  const wordCount = summary ? summary.trim().split(/\s+/).length : 0
  const readingTime = Math.max(1, Math.round(wordCount / 200))
  const keyPoints = summary ? extractKeyPoints(summary) : []

  // Show aurora loading only until the first token arrives
  const showLoading = isSummarizing && !summary
  // Show error if done and failed with no text
  const showError = !showLoading && !!summaryError && !summary

  return (
    <div className="relative w-full h-full">
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
            <ErrorContent />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Summary metadata header */}
            {summary && (
              <motion.div
                className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-800"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-neutral-500">
                  <SvgIcon svg={clockSvg} size={14} className="text-gray-500 dark:text-neutral-500" />
                  <span>{readingTime} min read</span>
                  <span>•</span>
                  <span>{wordCount} words</span>
                </div>
                {keyPoints.length > 0 && (
                  <motion.div
                    className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400"
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <span>✓ {keyPoints.length} key points</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Scrollable streaming text */}
            <motion.div
              className="flex-1 overflow-y-auto glass-scroll pr-1 pb-2"
              role="region"
              aria-label="AI Summary"
              aria-live="polite"
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <MarkdownBody text={summary} />
              {isSummarizing && (
                <span className="inline-flex items-center mt-1 ml-0.5 text-gray-600 dark:text-neutral-400">
                  <BlinkingCursor />
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
