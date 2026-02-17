import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowClockwise, X, LockSimple, Globe, MagnifyingGlass, ClockCounterClockwise } from '@phosphor-icons/react'
import { useFocusedTabId, useFocusedTabUrl, useFocusedTabNavState } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { useHistoryStore, type HistoryEntry } from '@/store/historyStore'
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
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
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

  return (
    <div className="relative">
      <div
        className={`
          relative flex items-center rounded-full h-10 px-1
          bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700
          shadow-lg
          transition-[width] duration-300 ease-out will-change-[width]
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
              {isLoading ? <X size={15} weight="bold" /> : <ArrowClockwise size={15} weight="bold" />}
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
                {iconKey === 'lock' && <LockSimple size={15} weight="fill" className="text-green-600" />}
                {iconKey === 'globe' && <Globe size={15} weight="regular" />}
                {iconKey === 'search' && <MagnifyingGlass size={15} weight="regular" />}
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
                <ClockCounterClockwise size={13} className="flex-shrink-0 text-gray-400 dark:text-neutral-500" weight="regular" />
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
