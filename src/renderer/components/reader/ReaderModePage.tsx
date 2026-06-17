import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import { SvgIcon } from '@/components/ui/SvgIcon'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import bookTextSvg from '@/assets/icons/Objects/Book_Text.svg?raw'
import { useUIStore } from '@/store/uiStore'
import { useTabStore } from '@/store/tabStore'
import { useSettingsStore } from '@/store/settingsStore'
import { extractReaderContent, type ReaderArticle } from '@/utils/extractReaderContent'
import { useFocusedTabId } from '@/hooks/useTabSelector'
import { SPRING, SPRING_CONTENT, SPRING_SNAPPY } from '@/utils/springs'

// Inject styles once at module level — never on re-render
const READER_STYLE_ID = 'reader-mode-styles'
if (typeof document !== 'undefined' && !document.getElementById(READER_STYLE_ID)) {
  const style = document.createElement('style')
  style.id = READER_STYLE_ID
  style.textContent = `
    /* ─── Base prose ─────────────────────────────────────────────────── */
    .reader-content {
      font-family: 'Georgia', 'Charter', 'Palatino Linotype', 'Book Antiqua', serif;
      font-size: 18.5px;
      line-height: 1.82;
      letter-spacing: 0.008em;
      color: #1c1c1c;
      -webkit-font-smoothing: antialiased;
      font-feature-settings: "kern" 1, "liga" 1, "onum" 1;
      word-spacing: 0.01em;
    }
    @media (prefers-color-scheme: dark) {
      .reader-content { color: #d8d8d8; }
    }
    .dark .reader-content { color: #d8d8d8; }

    /* ─── Paragraphs ─────────────────────────────────────────────────── */
    .reader-content p {
      margin: 0 0 1.55em;
      hanging-punctuation: first last;
    }
    .reader-content p + p { text-indent: 0; }

    /* ─── Headings ───────────────────────────────────────────────────── */
    .reader-content h1,
    .reader-content h2,
    .reader-content h3,
    .reader-content h4 {
      font-family: -apple-system, 'Inter', 'Helvetica Neue', sans-serif;
      font-weight: 700;
      line-height: 1.22;
      letter-spacing: -0.02em;
      color: #111111;
      margin: 2.6em 0 0.65em;
    }
    .dark .reader-content h1,
    .dark .reader-content h2,
    .dark .reader-content h3,
    .dark .reader-content h4 { color: #ededed; }
    .reader-content h1 { font-size: 1.65rem; }
    .reader-content h2 { font-size: 1.35rem; }
    .reader-content h3 { font-size: 1.12rem; letter-spacing: -0.01em; }
    .reader-content h4 { font-size: 1rem; font-weight: 600; letter-spacing: 0; }

    /* ─── Links ──────────────────────────────────────────────────────── */
    .reader-content a {
      color: #1a6bcc;
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 3px;
      transition: color 0.15s ease;
    }
    .dark .reader-content a { color: #5b9ef5; }
    .reader-content a:hover { color: #0f4a99; }
    .dark .reader-content a:hover { color: #82b8ff; }

    /* ─── Images ─────────────────────────────────────────────────────── */
    .reader-content img {
      max-width: 100%;
      height: auto;
      border-radius: 5px;
      margin: 1.8em 0;
      display: block;
      /* Prevent layout thrash while images load */
      content-visibility: auto;
    }

    /* ─── Figures ────────────────────────────────────────────────────── */
    .reader-content figure { margin: 2em 0; }
    .reader-content figcaption {
      font-family: -apple-system, 'Inter', 'Helvetica Neue', sans-serif;
      font-size: 13px;
      line-height: 1.5;
      letter-spacing: 0.01em;
      color: #888;
      margin-top: 0.6em;
      text-align: center;
    }
    .dark .reader-content figcaption { color: #666; }

    /* ─── Blockquotes ────────────────────────────────────────────────── */
    .reader-content blockquote {
      margin: 2em 0;
      padding: 0.1em 0 0.1em 1.25em;
      border-left: 3px solid rgba(0,0,0,0.15);
      font-style: italic;
      color: #3a3a3a;
    }
    .dark .reader-content blockquote {
      border-left-color: rgba(255,255,255,0.18);
      color: #b0b0b0;
    }
    .reader-content blockquote p { font-size: 1.06em; line-height: 1.75; }

    /* ─── Code ───────────────────────────────────────────────────────── */
    .reader-content code {
      font-family: 'SF Mono', 'Fira Code', 'Fira Mono', monospace;
      font-size: 0.84em;
      background: rgba(0,0,0,0.055);
      border-radius: 3px;
      padding: 0.15em 0.38em;
      letter-spacing: -0.01em;
    }
    .dark .reader-content code { background: rgba(255,255,255,0.09); }
    .reader-content pre {
      background: rgba(0,0,0,0.04);
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 6px;
      padding: 1.1em 1.3em;
      overflow-x: auto;
      margin: 1.5em 0;
    }
    .dark .reader-content pre {
      background: rgba(255,255,255,0.05);
      border-color: rgba(255,255,255,0.08);
    }
    .reader-content pre code {
      background: none;
      padding: 0;
      font-size: 0.875em;
      line-height: 1.65;
    }

    /* ─── Lists ──────────────────────────────────────────────────────── */
    .reader-content ul,
    .reader-content ol { margin: 0 0 1.55em; padding-left: 1.6em; }
    .reader-content li { margin-bottom: 0.5em; padding-left: 0.15em; }
    .reader-content li::marker { color: #999; }
    .dark .reader-content li::marker { color: #666; }

    /* ─── Horizontal rules ───────────────────────────────────────────── */
    .reader-content hr {
      border: none;
      border-top: 1px solid rgba(0,0,0,0.1);
      margin: 2.5em auto;
      width: 40%;
    }
    .dark .reader-content hr { border-top-color: rgba(255,255,255,0.1); }

    /* ─── Tables ─────────────────────────────────────────────────────── */
    .reader-content table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
      margin: 1.75em 0;
      font-family: -apple-system, 'Inter', 'Helvetica Neue', sans-serif;
    }
    .reader-content th {
      text-align: left;
      font-weight: 600;
      font-size: 0.8em;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border-bottom: 2px solid rgba(0,0,0,0.12);
      padding: 0.5em 0.75em 0.5em 0;
      color: #555;
    }
    .dark .reader-content th {
      border-bottom-color: rgba(255,255,255,0.12);
      color: #888;
    }
    .reader-content td {
      border-bottom: 1px solid rgba(0,0,0,0.06);
      padding: 0.6em 0.75em 0.6em 0;
      vertical-align: top;
    }
    .dark .reader-content td { border-bottom-color: rgba(255,255,255,0.06); }

    /* ─── Selection ──────────────────────────────────────────────────── */
    .reader-content ::selection { background: rgba(26,107,204,0.18); }
    .dark .reader-content ::selection { background: rgba(91,158,245,0.22); }

    /* ─── Scroll container ───────────────────────────────────────────── */
    .reader-scroll {
      overflow-y: auto;
      /* Promote to its own compositor layer so scroll never triggers
         a paint on the parent. This is the single biggest scroll fix. */
      will-change: scroll-position;
      /* GPU-composited overscroll bounce on macOS/iOS */
      -webkit-overflow-scrolling: touch;
      /* Contain layout/paint within this subtree */
      contain: strict;
    }

    /* ─── Reduced motion ─────────────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .reader-content * { transition: none !important; }
    }
  `
  document.head.appendChild(style)
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function ReaderLoadingState({ disableAnimations }: { disableAnimations: boolean }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-5">
      <motion.div
        animate={disableAnimations ? undefined : { rotate: [0, 4, -4, 0], y: [0, -4, 0] }}
        transition={disableAnimations ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <SvgIcon svg={bookTextSvg} size={36} className="text-emerald-500/70 dark:text-emerald-400/70" />
      </motion.div>
      <div className="flex flex-col items-center gap-3 w-48">
        <p className="text-sm text-gray-500 dark:text-neutral-400">Extracting article…</p>
        <div className="flex gap-1.5 w-full">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1 flex-1 rounded-full bg-emerald-500/30 dark:bg-emerald-400/30"
              animate={disableAnimations ? undefined : { scaleY: [1, 2.2, 1], opacity: [0.35, 1, 0.35] }}
              transition={
                disableAnimations
                  ? { duration: 0 }
                  : { duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Plain div wrapper for article body — keeps Framer Motion out of the scroll path.
// Using a ref + direct DOM mutation means we never trigger a React re-render when
// setting innerHTML, and Framer never observes this subtree for layout changes.
const ArticleBody = memo(function ArticleBody({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html
    }
  }, [html])

  // eslint-disable-next-line react/no-danger -- intentional: set via ref, not prop
  return <div ref={ref} className="reader-content" />
})

function ReaderModePageInner(): React.JSX.Element {
  const { isOpen, closeReaderMode } = useUIStore(useShallow((s) => ({
    isOpen: s.isReaderModeOpen,
    closeReaderMode: s.closeReaderMode,
  })))
  const focusedTabId = useFocusedTabId()
  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects)
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)
  const [article, setArticle] = useState<ReaderArticle | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadArticle = useCallback(async (tabId: string) => {
    setIsLoading(true)
    setError(null)
    setArticle(null)

    const result = await extractReaderContent(tabId)
    if (result) {
      setArticle(result)
    } else {
      setError('Could not extract readable content from this page.')
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setArticle(null)
      setError(null)
      setIsLoading(false)
      return
    }

    const tabId = focusedTabId ?? useTabStore.getState().activeTabId
    if (tabId) {
      loadArticle(tabId)
    } else {
      setError('No active tab to read.')
      setIsLoading(false)
    }
  }, [isOpen, focusedTabId, loadArticle])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeReaderMode()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeReaderMode])

  const surfaceClass = disableBlurEffects
    ? 'bg-[#FAFAF8] dark:bg-[#111213] border border-black/10 dark:border-white/10'
    : 'bg-[#FAFAF8] dark:bg-[#18191C] border border-black/5 dark:border-white/5'

  const spring = disableAnimations ? { duration: 0 } : SPRING
  const contentSpring = disableAnimations ? { duration: 0 } : SPRING_CONTENT
  const snappy = disableAnimations ? { duration: 0 } : SPRING_SNAPPY

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[150] [app-region:no-drag]"
          initial={disableAnimations ? false : { clipPath: 'circle(0% at 96% 96%)' }}
          animate={{ clipPath: 'circle(150% at 96% 96%)' }}
          exit={disableAnimations ? undefined : { clipPath: 'circle(0% at 96% 96%)' }}
          transition={spring}
        >
          <motion.div
            className={`absolute inset-0 ${surfaceClass}`}
            initial={disableAnimations ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={disableAnimations ? undefined : { opacity: 0 }}
            transition={{ duration: disableAnimations ? 0 : 0.25 }}
          />

          <div className="relative z-10 flex flex-col h-full">
            {/* Toolbar — animates in once, then stays static */}
            <motion.div
              className="flex items-center justify-between px-6 py-3 shrink-0"
              initial={disableAnimations ? false : { opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={disableAnimations ? undefined : { opacity: 0, y: -12 }}
              transition={{ ...contentSpring, delay: disableAnimations ? 0 : 0.12 }}
            >
              <div className="min-w-0">
                {article && (
                  <p className="text-[12px] tracking-[0.04em] uppercase font-medium text-gray-400 dark:text-neutral-500 truncate">
                    {article.siteName ?? getHostname(article.url)}
                  </p>
                )}
              </div>
              <motion.button
                onClick={closeReaderMode}
                aria-label="Close reader mode"
                whileTap={{ scale: 0.86 }}
                transition={snappy}
                className="h-9 w-9 rounded-full flex items-center justify-center text-gray-500 dark:text-neutral-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
              >
                <SvgIcon svg={closeSvg} size={15} />
              </motion.button>
            </motion.div>

            {/*
              Scroll area — plain div, NOT a motion component.
              Framer Motion adds a ResizeObserver + transform tracking to every
              motion element, which fires on every scroll tick and triggers
              unnecessary paints. A regular div with `will-change: scroll-position`
              (applied via .reader-scroll) is composited separately by the GPU.
            */}
            <div className="flex-1 min-h-0 reader-scroll px-6 pb-10">
              {isLoading && <ReaderLoadingState disableAnimations={disableAnimations} />}

              {!isLoading && error && (
                <motion.div
                  className="flex flex-col items-center justify-center h-48 gap-3 text-center max-w-md mx-auto"
                  initial={disableAnimations ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={contentSpring}
                >
                  <p className="text-sm text-gray-600 dark:text-neutral-300">{error}</p>
                  {focusedTabId && (
                    <button
                      onClick={() => loadArticle(focusedTabId)}
                      className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
                    >
                      Try again
                    </button>
                  )}
                </motion.div>
              )}

              {!isLoading && article && (
                /*
                  Article wrapper — fade+slide plays once on mount, then this node
                  is never touched by Framer again. The heavy innerHTML lives in
                  ArticleBody (a plain div), completely outside Framer's observation.
                */
                <motion.article
                  className="max-w-[42rem] mx-auto pt-6 pb-20"
                  initial={disableAnimations ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...contentSpring, delay: disableAnimations ? 0 : 0.18 }}
                >
                  {/* Article header — single animation, no layout tracking needed */}
                  <header className="mb-10 pb-8 border-b border-black/[0.08] dark:border-white/[0.08]">
                    <h1 className="text-[1.9rem] font-bold leading-[1.22] tracking-[-0.022em] text-[#111111] dark:text-[#EBEBEB] mb-4">
                      {article.title}
                    </h1>
                    {article.byline && (
                      <p className="text-[12.5px] tracking-[0.05em] uppercase font-semibold text-gray-400 dark:text-neutral-500 mt-3">
                        {article.byline}
                      </p>
                    )}
                  </header>

                  {/* Article body — lives outside Framer's subtree entirely */}
                  <ArticleBody html={article.content} />
                </motion.article>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const ReaderModePage = memo(ReaderModePageInner)