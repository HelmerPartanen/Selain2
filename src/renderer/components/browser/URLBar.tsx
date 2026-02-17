import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowClockwiseIcon, X as XIcon, LockIcon, Globe, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useActiveTabId, useActiveTabUrl, useActiveTabNavState } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { Button } from '@/components/ui/Button'
import { useSpring, SPRINGS } from '@/hooks/useSpring'
import { normalizeURL, simplifyUrl, isBlankOrSpecialUrl, isSecureUrl } from './urlUtils'

function URLBarInner({ onFocusChange }: { onFocusChange?: (focused: boolean) => void }): React.JSX.Element {
  const tabId = useActiveTabId()
  const url = useActiveTabUrl()
  const { isLoading } = useActiveTabNavState()
  const updateTab = useTabStore((s) => s.updateTab)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const width = useSpring(isFocused ? 500 : 360, SPRINGS.stiff)
  const iconRotation = useSpring(isLoading ? 180 : 0, SPRINGS.snappy)

  useEffect(() => {
    if (!isFocused) setInputValue(isBlankOrSpecialUrl(url) ? '' : simplifyUrl(url))
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
        setInputValue(isBlankOrSpecialUrl(url) ? '' : url)
        inputRef.current?.blur()
      }
    },
    [inputValue, navigate, url]
  )

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    onFocusChange?.(true)
    setInputValue(isBlankOrSpecialUrl(url) ? '' : url)
    requestAnimationFrame(() => inputRef.current?.select())
  }, [url, onFocusChange])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onFocusChange?.(false)
  }, [onFocusChange])

  const handleReloadOrStop = useCallback(() => {
    if (!tabId) return
    const wv = webviewRegistry.get(tabId)
    if (!wv) return
    isLoading ? wv.stop() : wv.reload()
  }, [tabId, isLoading])

  const isSecure = isSecureUrl(url)
  const showSiteIcon = !isFocused && url && !isBlankOrSpecialUrl(url)

  return (
    <div
      className="flex items-center rounded-full h-10 px-1 gap-1 bg-white/60 backdrop-blur-2xl shadow-lg border border-white/30"
      style={{ width, willChange: 'width' }}
    >
      <Button variant="icon" onClick={handleReloadOrStop} aria-label={isLoading ? 'Stop' : 'Reload'}>
        <div style={{ transform: `rotate(${iconRotation}deg)` }}>
          {isLoading ? <XIcon size={15} weight="bold" /> : <ArrowClockwiseIcon size={15} weight="bold" />}
        </div>
      </Button>

      <div className="relative flex-1 min-w-0 flex items-center h-full">
        <div className="absolute left-3 z-10 flex items-center pointer-events-none text-gray-400">
          {showSiteIcon ? (
            isSecure ? <LockIcon size={12} weight="fill" className="text-green-600" /> : <Globe size={12} weight="regular" />
          ) : (
            <MagnifyingGlassIcon size={15} weight="regular" />
          )}
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
          className="w-full h-full pl-9 pr-3 text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-400 focus:ring-0"
        />
      </div>
    </div>
  )
}

export const URLBar = memo(URLBarInner)
