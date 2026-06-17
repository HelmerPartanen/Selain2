import { memo, useCallback, useEffect, useState } from 'react'
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
    ? 'bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10'
    : 'bg-white dark:bg-[#1D1F23] border border-black/5 dark:border-white/5'

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
            <motion.div
              className="flex items-center justify-between px-5 py-3 shrink-0"
              initial={disableAnimations ? false : { opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={disableAnimations ? undefined : { opacity: 0, y: -12 }}
              transition={{ ...contentSpring, delay: disableAnimations ? 0 : 0.12 }}
            >
              <div className="min-w-0">
                {article && (
                  <p className="text-sm text-gray-600 dark:text-neutral-400 truncate mt-0.5">
                    {article.siteName ?? getHostname(article.url)}
                  </p>
                )}
              </div>
              <motion.button
                onClick={closeReaderMode}
                aria-label="Close reader mode"
                whileTap={{ scale: 0.86 }}
                transition={snappy}
                className="h-9 w-9 rounded-full flex items-center justify-center text-gray-600 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
              >
                <SvgIcon svg={closeSvg} size={16} />
              </motion.button>
            </motion.div>

            <div className="flex-1 overflow-auto px-5 pb-10">
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
                <motion.article
                  className="reader-article max-w-[42rem] mx-auto"
                  initial={disableAnimations ? false : { opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...contentSpring, delay: disableAnimations ? 0 : 0.18 }}
                >
                  <motion.header
                    className="mb-8"
                    initial={disableAnimations ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...contentSpring, delay: disableAnimations ? 0 : 0.22 }}
                  >
                    <h1 className="text-3xl font-semibold leading-tight text-gray-900 dark:text-neutral-100 mb-3">
                      {article.title}
                    </h1>
                    {article.byline && (
                      <p className="text-sm text-gray-500 dark:text-neutral-400">
                        {article.byline}
                      </p>
                    )}
                  </motion.header>
                  <motion.div
                    className="reader-content text-[17px] leading-[1.75] text-gray-800 dark:text-neutral-200"
                    initial={disableAnimations ? false : { opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...contentSpring, delay: disableAnimations ? 0 : 0.3 }}
                    dangerouslySetInnerHTML={{ __html: article.content }}
                  />
                </motion.article>
              )}
            </div>
          </div>

          <style>{`
            .reader-content img {
              max-width: 100%;
              height: auto;
              border-radius: 6px;
              margin: 1.25rem 0;
            }
            .reader-content p {
              margin: 0 0 1.25rem;
            }
            .reader-content h1, .reader-content h2, .reader-content h3 {
              font-weight: 600;
              line-height: 1.3;
              margin: 2rem 0 0.75rem;
              color: inherit;
            }
            .reader-content h1 { font-size: 1.5rem; }
            .reader-content h2 { font-size: 1.25rem; }
            .reader-content h3 { font-size: 1.1rem; }
            .reader-content a {
              color: #3b82f6;
              text-decoration: underline;
              text-underline-offset: 2px;
            }
            .reader-content blockquote {
              margin: 1.25rem 0;
              padding-left: 1rem;
              border-left: 3px solid rgba(128,128,128,0.35);
              color: inherit;
              opacity: 0.85;
            }
            .reader-content ul, .reader-content ol {
              margin: 0 0 1.25rem;
              padding-left: 1.5rem;
            }
            .reader-content li {
              margin-bottom: 0.4rem;
            }
            .reader-content figure {
              margin: 1.5rem 0;
            }
            .reader-content figcaption {
              font-size: 0.85rem;
              color: inherit;
              opacity: 0.7;
              margin-top: 0.5rem;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const ReaderModePage = memo(ReaderModePageInner)
