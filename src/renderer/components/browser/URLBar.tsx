import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowClockwise, X as StopIcon, Lock, Globe, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useActiveTabId, useActiveTabUrl, useActiveTabNavState } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { Button } from '@/components/ui/Button'

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

/** Strip protocol, www., and trailing slash for a clean unfocused display */
function simplifyUrl(raw: string): string {
  if (!raw || raw === 'about:blank' || raw.startsWith('browser://')) return ''
  try {
    const u = new URL(raw)
    let host = u.hostname.replace(/^www\./, '')
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

  const simplifiedUrl = simplifyUrl(url)

  const navigate = useCallback(
    (targetUrl: string) => {
      if (!tabId) return
      const normalized = normalizeURL(targetUrl)
      updateTab(tabId, { url: normalized })
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
    // Show the full URL when focused so the user can edit it
    setInputValue(url === 'about:blank' || url.startsWith('browser://') ? '' : url)
    requestAnimationFrame(() => {
      inputRef.current?.select()
    })
  }, [url, onFocusChange])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onFocusChange?.(false)
  }, [onFocusChange])

  const handleReloadOrStop = useCallback(() => {
    if (!tabId) return
    const webview = webviewRegistry.get(tabId)
    if (!webview) return
    if (isLoading) {
      webview.stop()
    } else {
      webview.reload()
    }
  }, [tabId, isLoading])

  const isSecure = url.startsWith('https://')
  // Always show inputValue, but inputValue is set to simplifiedUrl when not focused, and to full url when focused
  const displayUrl = inputValue

  return (
  <div
  className={`
    flex items-center rounded-full h-10 px-2 gap-1
    bg-white/70 backdrop-blur-md
    shadow-lg
    transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
    ${isFocused ? 'w-[500px]' : 'w-[360px]'}
  `}
>
  {/* Reload / Stop */}
  <Button
    variant="icon"
    onClick={handleReloadOrStop}
    aria-label={isLoading ? 'Stop loading' : 'Reload'}
  >
    {isLoading ? <StopIcon size={15} weight="bold" /> : <ArrowClockwise size={15} weight="bold" />}
  </Button>

  {/* URL input */}
  <div className="relative flex-1 min-w-0 flex items-center h-full">
    {/* Left icon */}
    <div className="absolute left-3 z-10 flex items-center pointer-events-none text-gray-400">
      {!isFocused && url && url !== 'about:blank' && !url.startsWith('browser://') ? (
        isSecure ? <Lock size={12} weight="fill" className="text-green-600" /> : <Globe size={12} weight="regular" />
      ) : (
        <MagnifyingGlassIcon size={12} weight="regular" />
      )}
    </div>

    <input
      ref={inputRef}
      type="text"
      value={displayUrl}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="Search or enter URL"
      spellCheck={false}
      autoComplete="off"
      className={`
        w-full h-full
        pl-9 pr-3
        text-sm text-gray-800
        bg-transparent
        outline-none
        placeholder:text-gray-400
        focus:ring-0
      `}
    />
  </div>
</div>

)
}

export const URLBar = memo(URLBarInner)
