import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useFocusedTabId } from '@/hooks/useTabSelector'
import { useUIStore } from '@/store/uiStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import chevronUpSvg from '@/assets/icons/Arrows/Chevron_Up.svg?raw'
import chevronDownSvg from '@/assets/icons/Arrows/Chevron_Down.svg?raw'

import { SPRING_POPUP } from '@/utils/springs'

function FindBarInner(): React.JSX.Element {
  const tabId = useFocusedTabId()
  const closeFindBar = useUIStore((s) => s.closeFindBar)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeMatch, setActiveMatch] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)

  // Focus input on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

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
      ;(webview as unknown as { findInPage(text: string, options?: { findNext?: boolean; forward?: boolean }): number })
        .findInPage(query)
    } else {
      ;(webview as unknown as { stopFindInPage(action: string): void })
        .stopFindInPage('clearSelection')
      setActiveMatch(0)
      setTotalMatches(0)
    }
  }, [query, tabId])

  const handleNext = useCallback(() => {
    if (!tabId || !query) return
    const webview = webviewRegistry.get(tabId)
    if (!webview) return
    ;(webview as unknown as { findInPage(text: string, options?: { findNext?: boolean; forward?: boolean }): number })
      .findInPage(query, { findNext: true, forward: true })
  }, [tabId, query])

  const handlePrev = useCallback(() => {
    if (!tabId || !query) return
    const webview = webviewRegistry.get(tabId)
    if (!webview) return
    ;(webview as unknown as { findInPage(text: string, options?: { findNext?: boolean; forward?: boolean }): number })
      .findInPage(query, { findNext: true, forward: false })
  }, [tabId, query])

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

  return (
    <motion.div
      className="fixed top-3 right-40 z-[25] [app-region:no-drag]"
      initial={{ y: -40, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -40, opacity: 0, scale: 0.95 }}
      transition={SPRING_POPUP}
    >
      <div className="flex items-center gap-1 rounded-xl h-9 px-2 glass-heavy">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in page"
          spellCheck={false}
          autoComplete="off"
          className="w-40 h-full text-xs text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-inset"
        />

        {query.length > 0 && (
          <span className="text-[10px] text-gray-400 dark:text-neutral-500 tabular-nums whitespace-nowrap px-1">
            {totalMatches > 0 ? `${activeMatch}/${totalMatches}` : 'No matches'}
          </span>
        )}

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
    </motion.div>
  )
}

export const FindBar = memo(FindBarInner)
