import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
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
import { useSearchEngineStore } from '@/store/searchEngineStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { Button } from '@/components/ui/Button'

const springIcon = { type: 'spring' as const, stiffness: 450, damping: 24 }
const springDropdown = { type: 'spring' as const, stiffness: 420, damping: 26, mass: 0.7 }

function normalizeURL(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return 'browser://newtab'
  if (trimmed === 'about:blank') return trimmed
  if (trimmed.startsWith('browser://')) return trimmed
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(trimmed)) return trimmed
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}/.test(trimmed)) {
    return `https://${trimmed}`
  }
  return useSearchEngineStore.getState().getSearchUrl(trimmed)
}

function simplifyUrl(raw: string): string {
  if (!raw || raw === 'about:blank' || raw.startsWith('browser://')) return ''
  try {
    const u = new URL(raw)
    const host = u.hostname.replace(/^www\./, '')
    const path = u.pathname + u.search + u.hash
    const trimmedPath = path === '/' ? '' : path
    return host + trimmedPath
  } catch {
    return raw
  }
}

function URLBarInner({ onFocusChange }: { onFocusChange?: (focused: boolean) => void }): React.JSX.Element {
  const tabId = useFocusedTabId()
  const url = useFocusedTabUrl()
  const { isLoading, loadProgress } = useFocusedTabNavState()
  const updateTab = useTabStore((s) => s.updateTab)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<HistoryEntry[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (!isFocused || !inputValue) {
      setSuggestions([])
      setSelectedIndex(-1)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const results = useHistoryStore.getState().search(inputValue)
      setSuggestions(results)
      setSelectedIndex(-1)
    }, 150)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inputValue, isFocused])

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
    // Delay blur to allow clicking suggestions
    setTimeout(() => {
      setIsFocused(false)
      onFocusChange?.(false)
      setSuggestions([])
      setSelectedIndex(-1)
    }, 150)
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
    ;(webview as unknown as { executeJavaScript(code: string): Promise<unknown> }).executeJavaScript(`
      (function() {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          if (!v.paused && v.readyState >= 2) {
            v.requestPictureInPicture().catch(() => {});
            return;
          }
        }
        if (videos.length > 0) videos[0].requestPictureInPicture().catch(() => {});
      })()
    `)
  }, [tabId])

  return (
    <div className="relative">
      <div
        className={`
          relative flex items-center rounded-full h-10 px-1
          bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700
          shadow-lg
          transition-[width] duration-200 ease-out will-change-[width]
          ${isFocused ? 'w-[500px]' : 'w-[360px]'}
        `}
      >
        {/* Focus ring */}
        <div
          className={`absolute inset-0 rounded-full pointer-events-none transition-opacity duration-200 ease-out ring-[2.5px] ring-blue-500/35 ${isFocused ? 'opacity-100' : 'opacity-0'}`}
        />
        <Button variant="icon" onClick={handleReloadOrStop} aria-label={isLoading ? 'Stop loading' : 'Reload'}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isLoading ? 'stop' : 'reload'}
              initial={{ scale: 0.4, opacity: 0, rotate: -120 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.4, opacity: 0, rotate: 120 }}
              transition={springIcon}
              className="flex items-center justify-center"
            >
              {isLoading ? <SvgIcon svg={closeSvg} size={15} /> : <SvgIcon svg={roundArrowsSvg} size={15} />}
            </motion.span>
          </AnimatePresence>
        </Button>

        <div className="relative flex-1 min-w-0 flex items-center h-full">
          <div className="absolute left-3 z-10 flex items-center pointer-events-none text-gray-500 dark:text-neutral-400">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={iconKey}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="flex items-center justify-center"
              >
                {iconKey === 'lock' && <SvgIcon svg={lockFillSvg} size={15} className="text-green-600" />}
                {iconKey === 'globe' && <SvgIcon svg={globeSvg} size={15} />}
                {iconKey === 'search' && <SvgIcon svg={searchSvg} size={15} />}
              </motion.span>
            </AnimatePresence>
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
            className="w-full h-full pl-9 pr-3 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:ring-0"
          />
        </div>

        {/* Bookmark star */}
        <AnimatePresence>
          {hasUrl && !isFocused && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="flex-shrink-0"
            >
              <Button variant="icon" onClick={handleToggleBookmark} aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={isBookmarked ? 'filled' : 'empty'}
                    initial={{ scale: 0.4, opacity: 0, rotate: -90 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.4, opacity: 0, rotate: 90 }}
                    transition={springIcon}
                    className="flex items-center justify-center"
                  >
                    <SvgIcon
                      svg={isBookmarked ? bookmarkFillSvg : bookmarkSvg}
                      size={15}
                      className={isBookmarked ? 'text-amber-500' : 'text-gray-400 dark:text-neutral-500'}
                    />
                  </motion.span>
                </AnimatePresence>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PiP button */}
        <AnimatePresence>
          {isPlayingMedia && !isFocused && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              onClick={handlePiP}
              aria-label="Picture in Picture"
              className="w-8 h-8 rounded-full flex items-center justify-center mr-0.5 flex-shrink-0 transition-colors duration-100 hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-90"
            >
              <SvgIcon svg={PIP_SVG} size={15} className="text-gray-400 dark:text-neutral-500" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Loading progress bar */}
        <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={false}
            animate={{
              scaleX: loadProgress > 0 ? loadProgress : 0,
              opacity: loadProgress > 0 && loadProgress < 1 ? 1 : 0
            }}
            transition={loadProgress === 0 ? { duration: 0.3 } : { type: 'spring', stiffness: 300, damping: 30 }}
            style={{ transformOrigin: 'left' }}
          />
        </div>
      </div>

      {/* Autocomplete dropdown */}
      <AnimatePresence>
        {suggestions.length > 0 && isFocused && (
          <motion.div
            className="absolute bottom-full mb-2 left-0 right-0 rounded-xl overflow-hidden z-[100] p-1 bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-xl"
            style={{ originY: 1 }}
            initial={{ scaleY: 0.6, opacity: 0, y: 8 }}
            animate={{ scaleY: 1, opacity: 1, y: 0 }}
            exit={{ scaleY: 0.6, opacity: 0, y: 8 }}
            transition={springDropdown}
          >
            {suggestions.map((entry, i) => (
              <button
                key={entry.url}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSuggestionClick(entry.url)
                }}
                className={`flex items-center gap-2.5 w-full px-2.5 h-8 rounded-lg text-left transition-colors duration-75 ${
                  i === selectedIndex
                    ? 'bg-blue-50 dark:bg-neutral-800 text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <SvgIcon svg={counterclockwiseSvg} size={13} className="flex-shrink-0 text-gray-400 dark:text-neutral-500" />
                <span className="flex-1 text-xs truncate">{entry.title || simplifyUrl(entry.url)}</span>
                <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-neutral-600 truncate max-w-[140px]">
                  {simplifyUrl(entry.url)}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const URLBar = memo(URLBarInner)
