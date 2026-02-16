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
      setInputValue(url === 'about:blank' || url.startsWith('browser://') ? '' : url)
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
  const displayUrl = isFocused ? inputValue : simplifiedUrl

  return (
    <div
      className="flex items-center glass rounded-full h-10 px-1.5 gap-0.5"
      style={{
        boxShadow: 'var(--shadow-float)',
        width: isFocused ? 500 : 360,
        transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Reload / Stop */}
      <Button
        variant="icon"
        onClick={handleReloadOrStop}
        aria-label={isLoading ? 'Stop loading' : 'Reload'}
      >
        {isLoading ? (
          <StopIcon size={15} weight="bold" />
        ) : (
          <ArrowClockwise size={15} weight="bold" />
        )}
      </Button>

      {/* URL input */}
      <div className="relative flex-1 min-w-0 flex items-center h-full">
        <div className="absolute left-2 z-10 flex items-center pointer-events-none">
          {!isFocused && url && url !== 'about:blank' && !url.startsWith('browser://') ? (
            isSecure ? (
              <Lock size={12} style={{ color: 'var(--text-muted)' }} weight="fill" />
            ) : (
              <Globe size={12} style={{ color: 'var(--text-muted)' }} weight="regular" />
            )
          ) : (
            <MagnifyingGlassIcon size={12} style={{ color: 'var(--text-muted)' }} weight="regular" />
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
          className="w-full bg-transparent rounded-full h-7 text-xs pl-7 pr-3 outline-none"
          style={{
            color: 'var(--text-primary)',
            ...(isFocused ? { background: 'var(--bg-surface)' } : {})
          }}
        />
      </div>
    </div>
  )
}

export const URLBar = memo(URLBarInner)
