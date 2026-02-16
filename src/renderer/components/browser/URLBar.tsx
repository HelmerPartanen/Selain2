import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CaretLeftIcon , CaretRightIcon , ArrowClockwise, X as StopIcon, Lock, Globe, Plus, MagnifyingGlass } from '@phosphor-icons/react'
import { useActiveTabId, useActiveTabUrl, useActiveTabNavState } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { Button } from '@/components/ui/Button'
import { AppMenu } from '@/components/layout/AppMenu'

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

function URLBarInner({ singleTab = false, onFocusChange }: { singleTab?: boolean; onFocusChange?: (focused: boolean) => void }): React.JSX.Element {
  const tabId = useActiveTabId()
  const addTab = useTabStore((s) => s.addTab)
  const url = useActiveTabUrl()
  const { isLoading, canGoBack, canGoForward } = useActiveTabNavState()
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

  const handleGoBack = useCallback(() => {
    if (!tabId) return
    webviewRegistry.get(tabId)?.goBack()
  }, [tabId])

  const handleGoForward = useCallback(() => {
    if (!tabId) return
    webviewRegistry.get(tabId)?.goForward()
  }, [tabId])

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

  const handleAddTab = useCallback(() => {
    addTab()
  }, [addTab])

  return (
    <div
      className="flex items-center gap-1 px-2 h-11 glass rounded-full"
      style={{
        boxShadow: 'var(--shadow-float)',
        width: isFocused ? 640 : 520,
        transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Menu */}
      <AppMenu />

      {/* Back / Forward */}
      <Button
        variant="icon"
        onClick={handleGoBack}
        disabled={!canGoBack}
        className="disabled:opacity-30"
        aria-label="Go back"
      >
        <CaretLeftIcon size={16} weight="bold" />
      </Button>

      <Button
        variant="icon"
        onClick={handleGoForward}
        disabled={!canGoForward}
        className="disabled:opacity-30"
        aria-label="Go forward"
      >
        <CaretRightIcon size={16} weight="bold" />
      </Button>

      {/* Reload / Stop */}
      <Button
        variant="icon"
        onClick={handleReloadOrStop}
        aria-label={isLoading ? 'Stop loading' : 'Reload'}
      >
        {isLoading ? (
          <StopIcon size={16} weight="bold" />
        ) : (
          <ArrowClockwise size={16} weight="bold" />
        )}
      </Button>

      {/* URL input area — recessed surface */}
      <div
        className="relative flex-1 min-w-0 flex items-center rounded-full h-8"
        style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-glass)' }}
      >
        <div className="absolute left-2.5 z-10 flex items-center pointer-events-none">
          {!isFocused && url && url !== 'about:blank' && !url.startsWith('browser://') ? (
            isSecure ? (
              <Lock size={12} style={{ color: 'var(--text-muted)' }} weight="fill" />
            ) : (
              <Globe size={12} style={{ color: 'var(--text-muted)' }} weight="regular" />
            )
          ) : (
            <MagnifyingGlass size={12} style={{ color: 'var(--text-muted)' }} weight="regular" />
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
          className="w-full bg-transparent rounded-full h-8 text-xs pl-7 pr-3 outline-none"
          style={{
            color: 'var(--text-primary)',
            ...(isFocused ? { background: 'var(--bg-surface-hover)' } : {})
          }}
        />
      </div>

      {/* New tab — only in single-tab mode */}
      {singleTab && (
        <Button variant="icon" onClick={handleAddTab} aria-label="New tab">
          <Plus size={16} weight="bold" />
        </Button>
      )}
    </div>
  )
}

export const URLBar = memo(URLBarInner)
