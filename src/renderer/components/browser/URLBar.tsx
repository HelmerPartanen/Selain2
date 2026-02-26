import { memo, useCallback, useDeferredValue, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon, PIP_SVG } from '@/components/ui/SvgIcon'
import roundArrowsSvg from '@/assets/icons/Arrows/Round_Arrows_2.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import lockFillSvg from '@/assets/icons/Objects/Lock_Fill.svg?raw'
import globeSvg from '@/assets/icons/Nature/Globe.svg?raw'
import searchSvg from '@/assets/icons/Objects/Search.svg?raw'
import counterclockwiseSvg from '@/assets/icons/Arrows/Counterclockwise.svg?raw'
import bookmarkSvg from '@/assets/icons/Objects/Bookmark.svg?raw'
import bookmarkFillSvg from '@/assets/icons/Objects/Bookmark_Fill.svg?raw'
import { useFocusedTabId, useFocusedTabUrl, useFocusedTabNavState, useFocusedTabMediaPlaying } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { useHistoryStore, type HistoryEntry } from '@/store/historyStore'
import { useBookmarkStore } from '@/store/bookmarkStore'
import { simplifyUrl, normalizeURL } from '@/utils/urlUtils'
import { logger } from '@/utils/logger'
import { fetchSearchSuggestions } from '@/utils/searchUtils'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { Button } from '@/components/ui/Button'
import { SiteInfoPopover } from './SiteInfoPopover'

import { SPRING_FAST, SPRING_POPUP, SPRING_EXPAND, SPRING_SNAPPY } from '@/utils/springs'

const LoadingProgressBar = memo(function LoadingProgressBar() {
  const { loadProgress } = useFocusedTabNavState()
  return (
    <div className="absolute bottom-0 left-4 right-4 h-[3px] rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-indigo-500 rounded-full"
        initial={false}
        animate={{
          scaleX: loadProgress > 0 ? loadProgress : 0,
          opacity: loadProgress > 0 && loadProgress < 1 ? 1 : 0
        }}
        transition={loadProgress === 0 ? { duration: 0.3 } : SPRING_EXPAND}
        style={{ transformOrigin: 'left' }}
      />
    </div>
  )
})

function URLBarInner({ onFocusChange }: { onFocusChange?: (focused: boolean) => void }): React.JSX.Element {
  const tabId = useFocusedTabId()
  const url = useFocusedTabUrl()
  const { isLoading } = useFocusedTabNavState()
  const updateTab = useTabStore((s) => s.updateTab)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const deferredInputValue = useDeferredValue(inputValue)
  const [isFocused, setIsFocused] = useState(false)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<(HistoryEntry & { type?: 'history' | 'search' | 'bookmark' })[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [suggestionsUnavailable, setSuggestionsUnavailable] = useState<null | 'offline' | 'error'>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestionRequestIdRef = useRef(0)
  const suggestionAbortRef = useRef<AbortController | null>(null)

  const [isSiteInfoOpen, setIsSiteInfoOpen] = useState(false)

  // URL bar focus request from keyboard shortcuts
  const urlBarFocusRequested = useUIStore((s) => s.urlBarFocusRequested)
  useEffect(() => {
    if (urlBarFocusRequested) {
      inputRef.current?.focus()
      useUIStore.getState().clearUrlBarFocus()
    }
  }, [urlBarFocusRequested])

  useEffect(() => {
    if (!isFocused) {
      setInputValue(url === 'about:blank' || url.startsWith('browser://') ? '' : simplifyUrl(url))
      setSuggestions([])
      setSelectedIndex(-1)
    }
  }, [url, isFocused])

  // Debounced autocomplete search
  useEffect(() => {
    if (!isFocused || deferredInputValue.length < 2) {
      suggestionRequestIdRef.current += 1
      suggestionAbortRef.current?.abort()
      suggestionAbortRef.current = null
      setSuggestions([])
      setSelectedIndex(-1)
      setSuggestionsUnavailable(null)
      return
    }

    const query = deferredInputValue
    const requestId = ++suggestionRequestIdRef.current
    let controller: AbortController | null = null
    setSuggestionsUnavailable(null)

    // Always compute local results immediately so the list feels instant.
    const historyResults = useHistoryStore
      .getState()
      .search(query)
      .map(r => ({ ...r, type: 'history' as const }))

    const bookmarkResults = useBookmarkStore
      .getState()
      .search(query)
      .slice(0, 6)
      .map(b => ({
        id: `bookmark-${b.id}`,
        url: b.url,
        title: b.title,
        favicon: b.favicon ?? '',
        visitCount: 0,
        lastVisit: 0,
        timestamp: b.createdAt,
        type: 'bookmark' as const
      }))

    const seedMap = new Map<string, (HistoryEntry & { type?: 'history' | 'search' | 'bookmark' })>()
    for (const item of [...historyResults, ...bookmarkResults]) {
      seedMap.set(item.url, item)
    }
    const initial = Array.from(seedMap.values())
    setSuggestions(initial.slice(0, 8))
    setSelectedIndex(-1)

    suggestionAbortRef.current?.abort()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      controller = new AbortController()
      suggestionAbortRef.current = controller

      if (!navigator.onLine) {
        if (suggestionRequestIdRef.current === requestId && !controller.signal.aborted) {
          setSuggestionsUnavailable('offline')
        }
        return
      }

      let searchResults: (HistoryEntry & { type: 'search' })[] = []
      try {
        const liveSuggestions = await fetchSearchSuggestions(query, controller.signal)
        searchResults = liveSuggestions.map(phrase => ({
          id: `search-${phrase}`,
          url: normalizeURL(phrase),
          title: phrase,
          visitCount: 0,
          lastVisit: 0,
          timestamp: Date.now(),
          favicon: '',
          type: 'search' as const
        }))
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError') && suggestionRequestIdRef.current === requestId && !controller.signal.aborted) {
          logger.error('Failed to fetch live suggestions', e)
          setSuggestionsUnavailable('error')
        }
      }

      // Ignore stale responses from older input values.
      if (suggestionRequestIdRef.current !== requestId || controller.signal.aborted) return

      // Combine and deduplicate by URL, preferring history/bookmarks over search
      const combined = [...initial, ...searchResults]
      const byUrl = new Map<string, (HistoryEntry & { type?: 'history' | 'search' | 'bookmark' })>()
      for (const item of combined) {
        const existing = byUrl.get(item.url)
        if (!existing) {
          byUrl.set(item.url, item)
          continue
        }
        if (item.type === 'history' || item.type === 'bookmark') {
          byUrl.set(item.url, item)
        }
      }
      const unique = Array.from(byUrl.values())

      setSuggestions(unique.slice(0, 8))
      setSelectedIndex(-1)
    }, 150)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (controller) controller.abort()
      if (suggestionAbortRef.current === controller) {
        suggestionAbortRef.current = null
      }
    }
  }, [deferredInputValue, isFocused])

  const navigate = useCallback(
    (targetUrl: string) => {
      if (!tabId) return
      updateTab(tabId, { url: normalizeURL(targetUrl) })
      setSuggestions([])
      setSelectedIndex(-1)
    },
    [tabId, updateTab]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % suggestions.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1))
          return
        }
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          navigate(suggestions[selectedIndex].url)
        } else {
          navigate(inputValue)
        }
        inputRef.current?.blur()
      } else if (e.key === 'Escape') {
        if (suggestions.length > 0) {
          setSuggestions([])
          setSelectedIndex(-1)
        } else {
          setInputValue(url === 'about:blank' || url.startsWith('browser://') ? '' : url)
          inputRef.current?.blur()
        }
      }
    },
    [inputValue, navigate, url, suggestions, selectedIndex]
  )

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    onFocusChange?.(true)
    setInputValue(url === 'about:blank' || url.startsWith('browser://') ? '' : url)
    requestAnimationFrame(() => inputRef.current?.select())
  }, [url, onFocusChange])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onFocusChange?.(false)
    suggestionRequestIdRef.current += 1
    suggestionAbortRef.current?.abort()
    suggestionAbortRef.current = null
    setSuggestions([])
    setSelectedIndex(-1)
    setSuggestionsUnavailable(null)
  }, [onFocusChange])

  const handleSuggestionClick = useCallback(
    (suggestionUrl: string) => {
      navigate(suggestionUrl)
      inputRef.current?.blur()
    },
    [navigate]
  )

  const handleReloadOrStop = useCallback(() => {
    if (!tabId) return
    const webview = webviewRegistry.get(tabId)
    if (!webview) return
    isLoading ? webview.stop() : webview.reload()
  }, [tabId, isLoading])

  const isSecure = url.startsWith('https://')
  const hasUrl = !!url && url !== 'about:blank' && !url.startsWith('browser://')

  const iconKey = !isFocused && hasUrl ? (isSecure ? 'lock' : 'globe') : 'search'

  // Bookmark state
  const isBookmarked = useBookmarkStore((s) => s.isBookmarked(url))
  const handleToggleBookmark = useCallback(() => {
    if (!hasUrl) return
    const store = useBookmarkStore.getState()
    if (store.isBookmarked(url)) {
      store.removeBookmark(url)
    } else {
      const tab = tabId ? useTabStore.getState().tabs[tabId] : null
      store.addBookmark(url, tab?.title || url, tab?.favicon)
    }
  }, [url, hasUrl, tabId])

  // PiP state
  const isPlayingMedia = useFocusedTabMediaPlaying()
  const handlePiP = useCallback(() => {
    if (!tabId) return
    const webview = webviewRegistry.get(tabId)
    if (!webview) return
    const webContentsId = (webview as any).getWebContentsId()
    if (webContentsId) {
      window.electronAPI.requestPiP(webContentsId)
    }
  }, [tabId])

  return (
    <div className="relative">
      <motion.div
        className="relative flex items-center h-10 will-change-[width] pl-2"
        animate={{ width: isFocused ? 500 : 320 }}
        transition={SPRING_EXPAND}
      >
        <Button variant="icon" onClick={handleReloadOrStop} aria-label={isLoading ? 'Stop loading' : 'Reload'}>
          <div className="relative flex items-center justify-center w-[15px] h-[15px]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={isLoading ? 'stop' : 'reload'}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0, position: 'absolute' }}
                transition={SPRING_FAST}
                className="flex items-center justify-center"
              >
                {isLoading ? <SvgIcon svg={closeSvg} size={15} /> : <SvgIcon svg={roundArrowsSvg} size={15} />}
              </motion.span>
            </AnimatePresence>
          </div>
        </Button>

        <div className="relative flex-1 min-w-0 flex items-center h-full">
          <div className="absolute left-1.5 z-10 flex items-center justify-center">
            <Button
              variant="icon"
              onClick={() => {
                if (iconKey !== 'search') {
                  setIsSiteInfoOpen(true)
                }
              }}
              className={iconKey === 'search' ? 'pointer-events-none opacity-80' : ''}
              aria-label="Site information"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={iconKey}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0, position: 'absolute' }}
                  transition={SPRING_FAST}
                  className="flex items-center justify-center text-gray-500 dark:text-neutral-400"
                >
                  {iconKey === 'lock' && <SvgIcon svg={lockFillSvg} size={14} className="text-green-600" />}
                  {iconKey === 'globe' && <SvgIcon svg={globeSvg} size={14} />}
                  {iconKey === 'search' && <SvgIcon svg={searchSvg} size={14} />}
                </motion.span>
              </AnimatePresence>
            </Button>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Search or enter URL"
            spellCheck={false}
            autoComplete="off"
            className="w-full h-full pl-[36px] pr-[36px] text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:ring-none"
          />

          {/* Clear input button */}
          <AnimatePresence>
            {isFocused && inputValue.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={SPRING_FAST}
                className="absolute right-1.5 z-10 flex items-center justify-center"
              >
                <Button
                  variant="icon"
                  onMouseDown={(e: any) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setInputValue('')
                    inputRef.current?.focus()
                  }}
                  onClick={(e: any) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setInputValue('')
                    inputRef.current?.focus()
                  }}
                  className="text-gray-500 dark:text-neutral-400 flex-shrink-0"
                  aria-label="Clear input"
                >
                  <SvgIcon svg={closeSvg} size={14} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bookmark star */}
        <AnimatePresence>
          {hasUrl && !isFocused && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -15, width: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: 0, width: 28 }}
              exit={{ scale: 0, opacity: 0, rotate: 15, width: 0 }}
              transition={SPRING_SNAPPY}
              className="flex-shrink-0 flex items-center justify-center overflow-hidden ml-1"
              style={{ originX: 0 }}
            >
              <Button variant="icon" onClick={handleToggleBookmark} aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'} className="flex-shrink-0">
                <div className="relative flex items-center justify-center w-[15px] h-[15px]">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={isBookmarked ? 'filled' : 'empty'}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0, position: 'absolute' }}
                      transition={SPRING_FAST}
                      className="flex items-center justify-center"
                    >
                      <SvgIcon
                        svg={isBookmarked ? bookmarkFillSvg : bookmarkSvg}
                        size={14}
                        className={isBookmarked ? 'text-amber-500' : 'text-gray-400 dark:text-neutral-500'}
                      />
                    </motion.span>
                  </AnimatePresence>
                </div>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PiP button */}
        <AnimatePresence>
          {isPlayingMedia && !isFocused && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 28, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={SPRING_FAST}
              className="flex-shrink-0 flex items-center justify-center overflow-hidden ml-1"
            >
              <Button
                variant="icon"
                onClick={handlePiP}
                aria-label="Picture in Picture"
                className="flex-shrink-0 text-gray-400 dark:text-neutral-500"
              >
                <SvgIcon svg={PIP_SVG} size={15} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading progress bar */}
        <LoadingProgressBar />
      </motion.div>

      {/* Autocomplete dropdown — show when there are suggestions or when inline hint (offline/error) */}
      <AnimatePresence>
        {(suggestions.length > 0 || (isFocused && deferredInputValue.length >= 2 && suggestionsUnavailable)) && isFocused && (
          <motion.div
            className="absolute bottom-full mb-2.5 p-1 left-0 right-0 rounded-[22px] overflow-hidden z-[100] glass"
            style={{ originY: 1 }}
            initial={{ scaleY: 0.6, opacity: 0, y: 6 }}
            animate={{ scaleY: 1, opacity: 1, y: 0 }}
            exit={{ scaleY: 0.6, opacity: 0, y: 6 }}
            transition={SPRING_POPUP}
          >
            {suggestions.map((entry, i) => {
              const isActive = selectedIndex === i
              return (
                <button
                  key={entry.url}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSuggestionClick(entry.url)
                  }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`relative flex items-center gap-2.5 w-full px-3 h-9 rounded-full text-left transition-colors duration-75 ${isActive
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  {(isActive || hoveredIdx === i) && (
                    <motion.div
                      layoutId="history-hover"
                      className="absolute inset-0 rounded-full glass glass-interactive"
                      initial={{ opacity: 0.6, filter: 'blur(2px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, filter: 'blur(2px)' }}
                      transition={SPRING_SNAPPY}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5 w-full">
                    {entry.type === 'search' ? (
                      <SvgIcon svg={searchSvg} size={14} className="flex-shrink-0 text-gray-400 dark:text-neutral-500" />
                    ) : entry.favicon ? (
                      <img src={entry.favicon} alt="" className="flex-shrink-0 w-4 h-4 rounded-sm object-contain" />
                    ) : (
                      <SvgIcon svg={counterclockwiseSvg} size={14} className="flex-shrink-0 text-gray-400 dark:text-neutral-500" />
                    )}
                    <span className="flex-1 text-[13px] truncate">{entry.title || simplifyUrl(entry.url)}</span>
                    {entry.type !== 'search' && (
                      <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-neutral-600 truncate max-w-[160px]">
                        {simplifyUrl(entry.url)}
                      </span>
                    )}
                    {entry.type && (
                      <span className="flex-shrink-0 text-[10px] uppercase tracking-wide text-gray-400 dark:text-neutral-600 ml-1">
                        {entry.type === 'history'
                          ? 'History'
                          : entry.type === 'bookmark'
                          ? 'Bookmark'
                          : 'Suggestion'}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
            {suggestionsUnavailable && (
              <div
                className="px-3 py-2 text-[11px] text-gray-500 dark:text-neutral-400 border-t border-black/5 dark:border-white/5 mt-1"
                role="status"
              >
                {suggestionsUnavailable === 'offline'
                  ? 'You\'re offline — live suggestions unavailable.'
                  : 'Suggestions temporarily unavailable.'}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <SiteInfoPopover
        isOpen={isSiteInfoOpen}
        onClose={() => setIsSiteInfoOpen(false)}
        url={url}
        isSecure={isSecure}
      />
    </div>
  )
}

export const URLBar = memo(URLBarInner)
