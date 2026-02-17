import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowClockwiseIcon, XIcon, LockSimpleIcon , GlobeIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useActiveTabId, useActiveTabUrl, useActiveTabNavState } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { Button } from '@/components/ui/Button'

const springIcon = { type: 'spring' as const, stiffness: 450, damping: 24 }

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
  const tabId = useActiveTabId()
  const url = useActiveTabUrl()
  const { isLoading } = useActiveTabNavState()
  const updateTab = useTabStore((s) => s.updateTab)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) {
      setInputValue(url === 'about:blank' || url.startsWith('browser://') ? '' : simplifyUrl(url))
    }
  }, [url, isFocused])

  const navigate = useCallback(
    (targetUrl: string) => {
      if (!tabId) return
      updateTab(tabId, { url: normalizeURL(targetUrl) })
    },
    [tabId, updateTab]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        navigate(inputValue)
        inputRef.current?.blur()
      } else if (e.key === 'Escape') {
        setInputValue(url === 'about:blank' || url.startsWith('browser://') ? '' : url)
        inputRef.current?.blur()
      }
    },
    [inputValue, navigate, url]
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
  }, [onFocusChange])

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
    <div
      className={`
        flex items-center rounded-full h-10 px-1
        bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700
        transition-all duration-200 ease-out will-change-[width,box-shadow]
        ${isFocused
          ? 'w-[500px] shadow-[0_0_0_2.5px_rgba(59,130,246,0.35),0_12px_20px_-4px_rgba(0,0,0,0.12)]'
          : 'w-[360px] shadow-lg'
        }
      `}
    >
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
            {isLoading ? <XIcon size={15} weight="bold" /> : <ArrowClockwiseIcon size={15} weight="bold" />}
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
              {iconKey === 'lock' && <LockSimpleIcon size={15} weight="fill" className="text-green-600" />}
              {iconKey === 'globe' && <GlobeIcon size={15} weight="regular" />}
              {iconKey === 'search' && <MagnifyingGlassIcon size={15} weight="regular" />}
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
    </div>
  )
}

export const URLBar = memo(URLBarInner)
