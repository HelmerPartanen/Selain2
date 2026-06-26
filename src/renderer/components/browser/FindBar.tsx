import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { m } from 'motion/react'
import { useFocusedTabId } from '@/hooks/useTabSelector'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { CLASSIC_CHROME_HEIGHT } from '@/components/layout/layoutConstants'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Input'
import { SvgIcon } from '@/components/ui/SvgIcon'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import chevronUpSvg from '@/assets/icons/Arrows/Chevron_Up.svg?raw'
import chevronDownSvg from '@/assets/icons/Arrows/Chevron_Down.svg?raw'

import { SPRING_POPUP } from '@/utils/springs'

function FindBarInner(): React.JSX.Element {
  const tabId = useFocusedTabId()
  const uiLayout = useSettingsStore((s) => s.uiLayout)
  const closeFindBar = useUIStore((s) => s.closeFindBar)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeMatch, setActiveMatch] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)
  const [matchCase, setMatchCase] = useState(false)
  const prevTabIdRef = useRef<string | null>(null)

  // Focus input on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  // Clear highlights in the previous tab when the user switches tabs while the find bar is open
  useEffect(() => {
    const prevId = prevTabIdRef.current
    prevTabIdRef.current = tabId
    if (prevId && prevId !== tabId && query) {
      const prevWebview = webviewRegistry.get(prevId)
      if (prevWebview) {
        ;(prevWebview as unknown as { stopFindInPage(action: string): void })
          .stopFindInPage('clearSelection')
      }
      setActiveMatch(0)
      setTotalMatches(0)
    }
  }, [tabId, query])

  // Listen for find-in-page results
  useEffect(() => {
    if (!tabId) return
    const webview = webviewRegistry.get(tabId)
    if (!webview) return

    const handleResult = (event: Event & { result?: { activeMatchOrdinal: number; matches: number } }): void => {
      if (event.result) {
        setActiveMatch(event.result.activeMatchOrdinal)
        setTotalMatches(event.result.matches)
      }
    }

    webview.addEventListener('found-in-page', handleResult as EventListener)
    return () => {
      webview.removeEventListener('found-in-page', handleResult as EventListener)
    }
  }, [tabId])

  // Search on query change
  useEffect(() => {
    if (!tabId) return
    const webview = webviewRegistry.get(tabId)
    if (!webview) return

    if (query.length > 0) {
      ;(webview as unknown as { findInPage(text: string, options?: { findNext?: boolean; forward?: boolean; matchCase?: boolean }): number })
        .findInPage(query, { matchCase })
    } else {
      ;(webview as unknown as { stopFindInPage(action: string): void })
        .stopFindInPage('clearSelection')
      setActiveMatch(0)
      setTotalMatches(0)
    }
  }, [query, tabId, matchCase])

  const handleNext = useCallback(() => {
    if (!tabId || !query) return
    const webview = webviewRegistry.get(tabId)
    if (!webview) return
    ;(webview as unknown as { findInPage(text: string, options?: { findNext?: boolean; forward?: boolean; matchCase?: boolean }): number })
      .findInPage(query, { findNext: true, forward: true, matchCase })
  }, [tabId, query, matchCase])

  const handlePrev = useCallback(() => {
    if (!tabId || !query) return
    const webview = webviewRegistry.get(tabId)
    if (!webview) return
    ;(webview as unknown as { findInPage(text: string, options?: { findNext?: boolean; forward?: boolean; matchCase?: boolean }): number })
      .findInPage(query, { findNext: true, forward: false, matchCase })
  }, [tabId, query, matchCase])

  const handleClose = useCallback(() => {
    if (tabId) {
      const webview = webviewRegistry.get(tabId)
      if (webview) {
        ;(webview as unknown as { stopFindInPage(action: string): void })
          .stopFindInPage('clearSelection')
      }
    }
    setQuery('')
    closeFindBar()
  }, [tabId, closeFindBar])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          handlePrev()
        } else {
          handleNext()
        }
      }
    },
    [handleClose, handleNext, handlePrev]
  )

  const topOffset = uiLayout === 'classic' ? CLASSIC_CHROME_HEIGHT + 8 : 12

  return (
    <m.div
      className="fixed right-40 z-[90] [app-region:no-drag]"
      style={{ top: topOffset }}
      initial={{ y: -40, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -40, opacity: 0, scale: 0.95 }}
      transition={SPRING_POPUP}
    >
      <div className="flex items-center gap-1 rounded-xl h-9 px-2 bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)] text-[var(--app-text-primary)]">
        <TextInput
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in page"
          spellCheck={false}
          autoComplete="off"
          inputSize="sm"
          className="h-full w-40 border-transparent bg-transparent px-1 text-xs ring-0 focus:border-transparent focus-visible:ring-2 focus-visible:ring-blue-400/40 focus-visible:ring-inset focus-visible:ring-offset-0"
        />

        {query.length > 0 && (
          <span className="text-[10px] text-gray-400 dark:text-neutral-500 tabular-nums whitespace-nowrap px-1">
            {totalMatches > 0 ? `${activeMatch}/${totalMatches}` : 'No matches'}
          </span>
        )}

        <Button
          variant={matchCase ? 'primary' : 'icon'}
          size="icon-sm"
          rounded="rounded-md"
          onClick={() => setMatchCase((v) => !v)}
          aria-label="Match case"
          aria-pressed={matchCase}
          className={matchCase ? 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/25 dark:text-blue-400' : 'text-[11px] font-semibold'}
        >
          Aa
        </Button>
        <Button variant="icon" onClick={handlePrev} aria-label="Previous match">
          <SvgIcon svg={chevronUpSvg} size={13} />
        </Button>
        <Button variant="icon" onClick={handleNext} aria-label="Next match">
          <SvgIcon svg={chevronDownSvg} size={13} />
        </Button>
        <Button variant="icon" onClick={handleClose} aria-label="Close find bar">
          <SvgIcon svg={closeSvg} size={13} />
        </Button>
      </div>
    </m.div>
  )
}

export const FindBar = memo(FindBarInner)
