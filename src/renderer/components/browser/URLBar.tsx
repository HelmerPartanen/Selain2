import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, ArrowClockwise, X as StopIcon, Lock, Globe, Plus } from '@phosphor-icons/react'
import { useActiveTabId, useActiveTabUrl, useActiveTabNavState } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { Button } from '@/components/ui/Button'
import { AppMenu } from '@/components/layout/AppMenu'
import { OverlaySpacer } from '@/components/ui/WindowControls'

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

function URLBarInner({ singleTab = false }: { singleTab?: boolean }): React.JSX.Element {
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
    // Show the full URL when focused so the user can edit it
    setInputValue(url === 'about:blank' || url.startsWith('browser://') ? '' : url)
    requestAnimationFrame(() => {
      inputRef.current?.select()
    })
  }, [url])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
  }, [])

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
  <div className={`flex items-center px-2 py-1.5 bg-[#F1F2F6] dark:bg-[#1C1C1E] border-t border-neutral-800 rounded-t-2xl ${
    singleTab ? '[app-region:drag]' : '[app-region:no-drag]'
  }`}>

    {/* Menu button */}
    <div className="[app-region:no-drag]">
      <AppMenu />
    </div>

    {/* Centered group */}
    <div className="flex items-center gap-2 mx-auto [app-region:no-drag]">

      <div className="rounded-full border-gradient">
        <div className="flex items-center bg-[#222224] rounded-full">
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
        </div>
      </div>

      <div className="rounded-full border-gradient">
        <div className="flex items-center bg-[#222224] rounded-full">
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
        </div>
      </div>

      <div className="relative flex items-center rounded-full">
        <div className="flex items-center bg-[#222224] rounded-full">
        {!isFocused && url && url !== 'about:blank' && !url.startsWith('browser://') && (
          <div className="absolute left-3 z-10 flex items-center justify-center h-8 pointer-events-none">
            {isSecure ? (
              <Lock size={13} className="text-zinc-500" weight="fill" />
            ) : (
              <Globe size={13} className="text-zinc-500" weight="regular" />
            )}
          </div>
        )}

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
          className={`w-6xl bg-transparent rounded-full h-8 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all duration-75 ${
            !isFocused && url && url !== 'about:blank' && !url.startsWith('browser://')
              ? 'pl-7 pr-3'
              : 'px-3'
          }`}
        />
        </div>
      </div>

    </div>

    {/* New tab button + overlay spacer when tab strip is hidden */}
    {singleTab && (
      <div className="flex items-center [app-region:no-drag]">
        <div className="rounded-full border-gradient">
          <div className="flex items-center bg-[#222224] rounded-full">
            <Button
              variant="icon"
              onClick={handleAddTab}
              aria-label="New tab"
            >
              <Plus size={16} weight="bold" />
            </Button>
          </div>
        </div>
        <OverlaySpacer />
      </div>
    )}
  </div>
)

}

export const URLBar = memo(URLBarInner)
