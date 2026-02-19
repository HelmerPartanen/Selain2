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
import { webviewRegistry } from '@/webview/webviewRegistry'
import { Button } from '@/components/ui/Button'

import { SPRING_FAST, SPRING_POPUP, SPRING_EXPAND, SPRING_SNAPPY } from '@/utils/springs'

function URLBarInner({ onFocusChange }: { onFocusChange?: (focused: boolean) => void }): React.JSX.Element {
  const tabId = useFocusedTabId()
  const url = useFocusedTabUrl()
  const { isLoading, loadProgress } = useFocusedTabNavState()
  const updateTab = useTabStore((s) => s.updateTab)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const deferredInputValue = useDeferredValue(inputValue)
  const [isFocused, setIsFocused] = useState(false)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<HistoryEntry[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
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
    if (!isFocused || deferredInputValue.length < 2) {
      setSuggestions([])
      setSelectedIndex(-1)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const results = useHistoryStore.getState().search(deferredInputValue)
      setSuggestions(results)
      setSelectedIndex(-1)
    }, 150)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
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
      ; (webview as unknown as { executeJavaScript(code: string): Promise<unknown> }).executeJavaScript(`
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
          <div className="absolute left-2 z-10 flex items-center justify-center pointer-events-none">
            <div className="w-5 h-5 flex items-center justify-center">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={iconKey}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={SPRING_FAST}
                  className="flex items-center justify-center text-gray-500 dark:text-neutral-400"
                >
                  {iconKey === 'lock' && <SvgIcon svg={lockFillSvg} size={14} className="text-green-600" />}
                  {iconKey === 'globe' && <SvgIcon svg={globeSvg} size={14} />}
                  {iconKey === 'search' && <SvgIcon svg={searchSvg} size={14} />}
                </motion.span>
              </AnimatePresence>
            </div>
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
            className="w-full h-full pl-8 pr-2 text-sm text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:ring-0"
          />
        </div>

        {/* Bookmark star */}
        <AnimatePresence>
          {hasUrl && !isFocused && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0, rotate: 15 }}
              transition={SPRING_SNAPPY}
              className="flex-shrink-0"
            >
              <Button variant="icon" onClick={handleToggleBookmark} aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}>
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
                        size={15}
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
              animate={{ width: 32, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={SPRING_FAST}
              className="flex-shrink-0 overflow-hidden mr-0.5"
            >
              <button
                onClick={handlePiP}
                aria-label="Picture in Picture"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-90"
              >
                <SvgIcon svg={PIP_SVG} size={15} className="text-gray-400 dark:text-neutral-500" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading progress bar */}
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
      </motion.div>

      {/* Autocomplete dropdown */}
      <AnimatePresence>
        {suggestions.length > 0 && isFocused && (
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
                      className="absolute inset-0 rounded-full glass bg-white/20 dark:bg-white/6"
                      initial={{ opacity: 0.6, filter: 'blur(2px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, filter: 'blur(2px)' }}
                      transition={SPRING_SNAPPY}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2.5 w-full">
                    {entry.favicon ? (
                      <img src={entry.favicon} alt="" className="flex-shrink-0 w-4 h-4 rounded-sm object-contain" />
                    ) : (
                      <SvgIcon svg={counterclockwiseSvg} size={14} className="flex-shrink-0 text-gray-400 dark:text-neutral-500" />
                    )}
                    <span className="flex-1 text-[13px] truncate">{entry.title || simplifyUrl(entry.url)}</span>
                    <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-neutral-600 truncate max-w-[160px]">
                      {simplifyUrl(entry.url)}
                    </span>
                  </span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const URLBar = memo(URLBarInner)
