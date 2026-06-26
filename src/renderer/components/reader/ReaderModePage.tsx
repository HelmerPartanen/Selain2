import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { m, AnimatePresence, useReducedMotion } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'

import { SvgIcon } from '@/components/ui/SvgIcon'

import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import bookTextSvg from '@/assets/icons/Objects/Book_Text.svg?raw'

import { useUIStore } from '@/store/uiStore'
import { useTabStore } from '@/store/tabStore'
import { useSettingsStore } from '@/store/settingsStore'

import {
  extractReaderContent,
  type ReaderArticle,
} from '@/utils/extractReaderContent'

import { useFocusedTabId } from '@/hooks/useTabSelector'

import { SPRING, SPRING_CONTENT, SPRING_SNAPPY } from '@/utils/springs'

const READER_STYLE_ID = 'reader-mode-styles'

if (typeof document !== 'undefined' && !document.getElementById(READER_STYLE_ID)) {
  const style = document.createElement('style')

  style.id = READER_STYLE_ID

  style.textContent = `
    /* ─── Base prose ─────────────────────────────────────────────────── */
    .reader-content {
      font-family: 'Helvetica', 'Helvetica Neue', Arial, sans-serif;
      font-size: 18.5px;
      line-height: 1.82;
      letter-spacing: 0.008em;
      color: inherit;
      -webkit-font-smoothing: antialiased;
      font-feature-settings: "kern" 1, "liga" 1, "onum" 1;
      word-spacing: 0.01em;
    }

    @media (max-width: 640px) {
      .reader-content {
        font-size: 17px;
        line-height: 1.76;
      }
    }

    /* ─── Paragraphs ─────────────────────────────────────────────────── */
    .reader-content p {
      margin: 0 0 1.55em;
      hanging-punctuation: first last;
      color: inherit;
    }

    .reader-content p + p {
      text-indent: 0;
    }

    /* ─── Headings ───────────────────────────────────────────────────── */
    .reader-content h1,
    .reader-content h2,
    .reader-content h3,
    .reader-content h4 {
      font-family: 'Helvetica', 'Helvetica Neue', Arial, sans-serif;
      font-weight: 700;
      line-height: 1.22;
      letter-spacing: -0.02em;
      color: inherit;
      margin: 2.6em 0 0.65em;
    }

    .reader-content h1 {
      font-size: 1.65rem;
    }

    .reader-content h2 {
      font-size: 1.35rem;
    }

    .reader-content h3 {
      font-size: 1.12rem;
      letter-spacing: -0.01em;
    }

    .reader-content h4 {
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: 0;
    }

    /* ─── Links ──────────────────────────────────────────────────────── */
    .reader-content a {
      color: var(--app-accent, #1a6bcc);
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 3px;
      transition: opacity 0.15s ease;
    }

    .reader-content a:hover {
      opacity: 0.78;
    }

    .reader-content a:focus-visible {
      outline: 2px solid var(--app-accent, #1a6bcc);
      outline-offset: 3px;
      border-radius: 2px;
    }

    /* ─── Images ─────────────────────────────────────────────────────── */
    .reader-content img {
      max-width: 100%;
      height: auto;
      border-radius: 5px;
      margin: 1.8em 0;
      display: block;
      content-visibility: auto;
    }

    /* ─── Figures ────────────────────────────────────────────────────── */
    .reader-content figure {
      margin: 2em 0;
    }

    .reader-content figcaption {
      font-family: 'Helvetica', 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      letter-spacing: 0.01em;
      color: var(--app-text-tertiary);
      margin-top: 0.6em;
      text-align: center;
    }

    /* ─── Blockquotes ────────────────────────────────────────────────── */
    .reader-content blockquote {
      margin: 2em 0;
      padding: 0.1em 0 0.1em 1.25em;
      border-left: 3px solid var(--app-separator);
      font-style: italic;
      color: inherit;
    }

    .reader-content blockquote p {
      font-size: 1.06em;
      line-height: 1.75;
    }

    /* ─── Code ───────────────────────────────────────────────────────── */
    .reader-content code {
      font-family: 'SF Mono', 'Fira Code', 'Fira Mono', monospace;
      font-size: 0.84em;
      background: var(--app-bg-secondary);
      border-radius: 3px;
      padding: 0.15em 0.38em;
      letter-spacing: -0.01em;
      color: inherit;
    }

    .reader-content pre {
      background: var(--app-bg-secondary);
      border: 1px solid var(--app-separator);
      border-radius: 6px;
      padding: 1.1em 1.3em;
      overflow-x: auto;
      margin: 1.5em 0;
    }

    .reader-content pre code {
      background: none;
      padding: 0;
      font-size: 0.875em;
      line-height: 1.65;
      color: inherit;
    }

    /* ─── Lists ──────────────────────────────────────────────────────── */
    .reader-content ul,
    .reader-content ol {
      margin: 0 0 1.55em;
      padding-left: 1.6em;
    }

    .reader-content li {
      margin-bottom: 0.5em;
      padding-left: 0.15em;
      color: inherit;
    }

    .reader-content li::marker {
      color: var(--app-text-tertiary);
    }

    /* ─── Horizontal rules ───────────────────────────────────────────── */
    .reader-content hr {
      border: none;
      border-top: 1px solid var(--app-separator);
      margin: 2.5em auto;
      width: 40%;
    }

    /* ─── Tables ─────────────────────────────────────────────────────── */
    .reader-content table {
      display: block;
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      border-collapse: collapse;
      font-size: 0.9em;
      margin: 1.75em 0;
      font-family: 'Helvetica', 'Helvetica Neue', Arial, sans-serif;
      -webkit-overflow-scrolling: touch;
    }

    .reader-content thead,
    .reader-content tbody,
    .reader-content tr {
      min-width: max-content;
    }

    .reader-content th {
      text-align: left;
      font-weight: 600;
      font-size: 0.8em;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border-bottom: 2px solid var(--app-separator);
      padding: 0.5em 0.75em 0.5em 0;
      color: var(--app-text-secondary);
      white-space: nowrap;
    }

    .reader-content td {
      border-bottom: 1px solid var(--app-separator);
      padding: 0.6em 0.75em 0.6em 0;
      vertical-align: top;
      color: inherit;
    }

    /* ─── Selection ──────────────────────────────────────────────────── */
    .reader-content ::selection {
      background: var(--app-control-active);
    }

    /* ─── Scroll container ───────────────────────────────────────────── */
    .reader-scroll {
      overflow-y: auto;
      will-change: scroll-position;
      -webkit-overflow-scrolling: touch;
      contain: content;
    }

    /* ─── Reduced motion ─────────────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .reader-content *,
      .reader-content *::before,
      .reader-content *::after {
        transition: none !important;
        animation: none !important;
      }
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

function sanitizeReaderHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')

  const dangerousSelectors = [
    'script',
    'style',
    'iframe',
    'object',
    'embed',
    'link',
    'meta',
    'base',
    'form',
    'input',
    'button',
    'textarea',
    'select',
  ].join(',')

  doc.querySelectorAll(dangerousSelectors).forEach((node) => node.remove())

  doc.querySelectorAll<HTMLElement>('*').forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim()
      const normalizedValue = value.replace(/\s+/g, '').toLowerCase()

      if (
        name.startsWith('on') ||
        name === 'srcdoc' ||
        name === 'style'
      ) {
        node.removeAttribute(attr.name)
        return
      }

      if (
        (name === 'href' || name === 'src') &&
        (normalizedValue.startsWith('javascript:') ||
          normalizedValue.startsWith('data:text/html'))
      ) {
        node.removeAttribute(attr.name)
        return
      }
    })

    if (node.tagName.toLowerCase() === 'a') {
      node.setAttribute('rel', 'noopener noreferrer')
    }

    if (node.tagName.toLowerCase() === 'img') {
      node.setAttribute('loading', 'lazy')
      node.setAttribute('decoding', 'async')
    }
  })

  return doc.body.firstElementChild?.innerHTML ?? ''
}

function ReaderLoadingState({
  reduceMotion,
}: {
  reduceMotion: boolean
}): React.JSX.Element {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5">
      <m.div
        animate={
          reduceMotion
            ? undefined
            : {
                rotate: [0, 4, -4, 0],
                y: [0, -4, 0],
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: 2.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
      >
        <SvgIcon
          svg={bookTextSvg}
          size={36}
          className="text-[var(--app-accent)] opacity-70"
        />
      </m.div>

      <div className="flex w-48 flex-col items-center gap-3">
        <p className="text-sm text-[var(--app-text-secondary)]">
          Extracting article…
        </p>

        <div className="flex w-full gap-1.5">
          {[0, 1, 2].map((i) => (
            <m.div
              key={i}
              className="h-1 flex-1 rounded-full bg-[var(--app-accent)] opacity-30"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      scaleY: [1, 2.2, 1],
                      opacity: [0.35, 1, 0.35],
                    }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 1.1,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: 'easeInOut',
                    }
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const ArticleBody = memo(function ArticleBody({
  html,
}: {
  html: string
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    ref.current.innerHTML = sanitizeReaderHtml(html)

    return () => {
      if (ref.current) ref.current.innerHTML = ''
    }
  }, [html])

  return <div ref={ref} className="reader-content" />
})

function ReaderModePageInner(): React.JSX.Element {
  const { isOpen, closeReaderMode } = useUIStore(
    useShallow((s) => ({
      isOpen: s.isReaderModeOpen,
      closeReaderMode: s.closeReaderMode,
    })),
  )

  const focusedTabId = useFocusedTabId()

  const disableAnimations = useSettingsStore((s) => s.disableAnimations)

  const prefersReducedMotion = useReducedMotion()

  const reduceMotion = disableAnimations || Boolean(prefersReducedMotion)

  const [article, setArticle] = useState<ReaderArticle | null>(null)

  const [isLoading, setIsLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [readerTabId, setReaderTabId] = useState<string | null>(null)

  const requestIdRef = useRef(0)

  const loadArticle = useCallback(async (tabId: string) => {
    const requestId = requestIdRef.current + 1

    requestIdRef.current = requestId

    setReaderTabId(tabId)
    setIsLoading(true)
    setError(null)
    setArticle(null)

    try {
      const result = await extractReaderContent(tabId)

      if (requestIdRef.current !== requestId) return

      if (result) {
        setArticle(result)
      } else {
        setError('Could not extract readable content from this page.')
      }
    } catch {
      if (requestIdRef.current !== requestId) return

      setError('Something went wrong while extracting this page.')
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      requestIdRef.current += 1

      setArticle(null)
      setError(null)
      setIsLoading(false)
      setReaderTabId(null)

      return
    }

    const tabId = focusedTabId ?? useTabStore.getState().activeTabId

    if (tabId) {
      loadArticle(tabId)
    } else {
      requestIdRef.current += 1

      setReaderTabId(null)
      setArticle(null)
      setError('No active tab to read.')
      setIsLoading(false)
    }
  }, [isOpen, focusedTabId, loadArticle])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeReaderMode()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeReaderMode])

  const handleRetry = useCallback(() => {
    const tabId = readerTabId ?? focusedTabId ?? useTabStore.getState().activeTabId

    if (tabId) {
      loadArticle(tabId)
    }
  }, [readerTabId, focusedTabId, loadArticle])

  const surfaceClass =
    'bg-[var(--app-bg-primary)]'

  const spring = reduceMotion ? { duration: 0 } : SPRING

  const contentSpring = reduceMotion ? { duration: 0 } : SPRING_CONTENT

  const snappy = reduceMotion ? { duration: 0 } : SPRING_SNAPPY

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          className="fixed inset-0 z-[150] [app-region:no-drag]"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={spring}
        >
          <m.div
            className={`absolute inset-0 ${surfaceClass}`}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          />

          <div className="relative z-10 flex h-full flex-col">
            <m.div
              className="flex shrink-0 items-center justify-between px-6 py-3"
              initial={reduceMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{
                ...contentSpring,
                delay: reduceMotion ? 0 : 0.08,
              }}
            >
              <div className="min-w-0">
                {article && (
                  <p className="truncate text-[12px] font-medium tracking-[0.04em] text-[var(--app-text-tertiary)]">
                    {article.siteName ?? getHostname(article.url)}
                  </p>
                )}
              </div>

              <m.button
                type="button"
                onClick={closeReaderMode}
                aria-label="Close reader mode"
                whileTap={reduceMotion ? undefined : { scale: 0.86 }}
                transition={snappy}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)]"
              >
                <SvgIcon svg={closeSvg} size={15} />
              </m.button>
            </m.div>

            <div className="reader-scroll min-h-0 flex-1 px-6 pb-10 text-[var(--app-text-primary)]">
              {isLoading && <ReaderLoadingState reduceMotion={reduceMotion} />}

              {!isLoading && error && (
                <m.div
                  className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 text-center"
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={contentSpring}
                >
                  <p className="text-sm text-[var(--app-text-secondary)]">
                    {error}
                  </p>

                  {(readerTabId || focusedTabId || useTabStore.getState().activeTabId) && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="text-sm text-[var(--app-accent)] transition-opacity hover:opacity-80"
                    >
                      Try again
                    </button>
                  )}
                </m.div>
              )}

              {!isLoading && article && (
                <m.article
                  className="mx-auto max-w-[42rem] pt-6 pb-20"
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    ...contentSpring,
                    delay: reduceMotion ? 0 : 0.12,
                  }}
                >
                  <header className="mb-10 border-b border-[var(--app-separator)] pb-8">
                    <h1 className="mb-4 text-[1.9rem] font-bold leading-[1.22] text-[var(--app-text-primary)]">
                      {article.title}
                    </h1>

                    {article.byline && (
                      <p className="mt-3 text-[12.5px] font-semibold uppercase tracking-[0.05em] text-[var(--app-text-tertiary)]">
                        {article.byline}
                      </p>
                    )}
                  </header>

                  <ArticleBody html={article.content} />
                </m.article>
              )}
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

export const ReaderModePage = memo(ReaderModePageInner)