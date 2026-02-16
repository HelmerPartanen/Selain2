import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, ArrowClockwise, X as StopIcon, Lock, Globe } from '@phosphor-icons/react'
import { useActiveTab } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { Button } from '@/components/ui/Button'

function isValidURL(str: string): boolean {
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(str)) return true
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}/.test(str)) return true
  if (str === 'about:blank') return true
  return false
}

function normalizeURL(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return 'about:blank'
  if (trimmed === 'about:blank') return trimmed
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(trimmed)) return trimmed
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}/.test(trimmed)) {
    return `https://${trimmed}`
  }
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
}

function URLBarInner(): React.JSX.Element {
  const activeTab = useActiveTab()
  const updateTab = useTabStore((s) => s.updateTab)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const url = activeTab?.url ?? ''
  const isLoading = activeTab?.isLoading ?? false
  const canGoBack = activeTab?.canGoBack ?? false
  const canGoForward = activeTab?.canGoForward ?? false
  const tabId = activeTab?.id

  useEffect(() => {
    if (!isFocused) {
      setInputValue(url === 'about:blank' ? '' : url)
    }
  }, [url, isFocused])

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
        setInputValue(url === 'about:blank' ? '' : url)
        inputRef.current?.blur()
      }
    },
    [inputValue, navigate, url]
  )

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    requestAnimationFrame(() => {
      inputRef.current?.select()
    })
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
  }, [])

  const handleGoBack = useCallback(() => {
    if (!tabId) return
    const webviews = document.querySelectorAll('webview')
    for (const wv of webviews) {
      const webview = wv as Electron.WebviewTag
      if (webview.classList.contains('z-10')) {
        webview.goBack()
        break
      }
    }
  }, [tabId])

  const handleGoForward = useCallback(() => {
    if (!tabId) return
    const webviews = document.querySelectorAll('webview')
    for (const wv of webviews) {
      const webview = wv as Electron.WebviewTag
      if (webview.classList.contains('z-10')) {
        webview.goForward()
        break
      }
    }
  }, [tabId])

  const handleReloadOrStop = useCallback(() => {
    if (!tabId) return
    const webviews = document.querySelectorAll('webview')
    for (const wv of webviews) {
      const webview = wv as Electron.WebviewTag
      if (webview.classList.contains('z-10')) {
        if (isLoading) {
          webview.stop()
        } else {
          webview.reload()
        }
        break
      }
    }
  }, [tabId, isLoading])

  const isSecure = url.startsWith('https://')
  const displayUrl = isFocused ? inputValue : (url === 'about:blank' ? '' : url)

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-surface-dim/50">
      <Button
        variant="icon"
        onClick={handleGoBack}
        disabled={!canGoBack}
        className="disabled:opacity-30"
        aria-label="Go back"
      >
        <ArrowLeft size={16} weight="bold" />
      </Button>

      <Button
        variant="icon"
        onClick={handleGoForward}
        disabled={!canGoForward}
        className="disabled:opacity-30"
        aria-label="Go forward"
      >
        <ArrowRight size={16} weight="bold" />
      </Button>

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

      <div className="relative flex-1 flex items-center">
        <div className="absolute left-3 flex items-center pointer-events-none">
          {!isFocused && url && url !== 'about:blank' ? (
            isSecure ? (
              <Lock size={13} className="text-text-dim" weight="fill" />
            ) : (
              <Globe size={13} className="text-text-dim" weight="regular" />
            )
          ) : null}
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
          className={`w-full bg-white/5 border border-border rounded-lg h-8 text-xs text-text placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-white/15 focus:bg-white/8 focus:border-white/10 transition-all duration-75 ${
            !isFocused && url && url !== 'about:blank' ? 'pl-8 pr-3' : 'px-3'
          }`}
        />
      </div>
    </div>
  )
}

export const URLBar = memo(URLBarInner)
