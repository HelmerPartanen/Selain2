import { memo, useCallback, useRef, useSyncExternalStore } from 'react'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { WebViewInstance } from './WebViewInstance'
import { NewTabPage } from '@/newtab/NewTabPage'
import { isSpecialPage } from '@/utils/urlUtils'

interface WebViewEntry {
  id: string
  initialUrl: string
}

function SpecialPage({ url }: { url: string }): React.JSX.Element | null {
  if (url === 'browser://newtab') return <NewTabPage />
  return null
}

/**
 * Derives the list of non-suspended tab entries.
 * Uses useSyncExternalStore + a custom equality check so the component
 * only rerenders when the *set* of non-suspended tab IDs actually changes,
 * NOT on every title / favicon / loading state update.
 */
function WebViewManagerInner(): React.JSX.Element {
  const activeTabId = useTabStore((s) => s.activeTabId)
  const splitTabId = useTabStore((s) => s.splitTabId)
  const focusedPanel = useTabStore((s) => s.focusedPanel)
  const setFocusedPanel = useTabStore((s) => s.setFocusedPanel)
  const splitRatio = useUIStore((s) => s.splitRatio)
  const isSplit = splitTabId !== null

  // Track which tabs have been mounted so we don't send new initialUrl on re-render.
  const mountedUrlsRef = useRef<Record<string, string>>({})
  const prevEntriesRef = useRef<WebViewEntry[]>([])
  // Fast-path: track count of non-suspended, non-special tabs
  const prevCountRef = useRef<number>(0)

  const subscribe = useCallback((cb: () => void) => useTabStore.subscribe(cb), [])

  const getSnapshot = useCallback((): WebViewEntry[] => {
    const { tabOrder, tabs } = useTabStore.getState()

    // Fast-path: count eligible tabs; if count hasn't changed and
    // all previous entries still exist as non-suspended/non-special,
    // skip the full scan.
    const prev = prevEntriesRef.current
    let count = 0
    for (const id of tabOrder) {
      const tab = tabs[id]
      if (tab && !tab.isSuspended && !isSpecialPage(tab.url)) count++
    }
    if (count === prevCountRef.current && count === prev.length) {
      let allMatch = true
      for (let i = 0; i < prev.length; i++) {
        const e = prev[i]!
        const tab = tabs[e.id]
        if (!tab || tab.isSuspended || isSpecialPage(tab.url)) {
          allMatch = false
          break
        }
      }
      if (allMatch) return prev
    }

    const result: WebViewEntry[] = []
    for (const id of tabOrder) {
      const tab = tabs[id]
      if (!tab || tab.isSuspended) {
        delete mountedUrlsRef.current[id]
        continue
      }
      if (isSpecialPage(tab.url)) {
        delete mountedUrlsRef.current[id]
        continue
      }
      if (!mountedUrlsRef.current[id]) {
        mountedUrlsRef.current[id] = tab.url
      }
      result.push({ id, initialUrl: mountedUrlsRef.current[id] })
    }
    if (
      prev.length === result.length &&
      prev.every((e, i) => result[i] !== undefined && e.id === result[i].id && e.initialUrl === result[i].initialUrl)
    ) {
      return prev
    }
    prevCountRef.current = result.length
    prevEntriesRef.current = result
    return result
  }, [])

  const activeEntries = useSyncExternalStore(subscribe, getSnapshot)

  // Get tab URLs for special page rendering
  const activeTabUrl = useTabStore((s) => {
    if (!s.activeTabId) return null
    return s.tabs[s.activeTabId]?.url ?? null
  })
  const splitTabUrl = useTabStore((s) => {
    if (!s.splitTabId) return null
    return s.tabs[s.splitTabId]?.url ?? null
  })

  const showPrimarySpecial = activeTabUrl ? isSpecialPage(activeTabUrl) : false
  const showSplitSpecial = splitTabUrl ? isSpecialPage(splitTabUrl) : false

  // In split mode, render two panels.
  // IMPORTANT: Each entry is rendered in only ONE panel to avoid duplicate <webview> elements
  // (which would cause double audio playback, double network requests, etc.)
  if (isSplit) {
    const primaryEntries = activeEntries.filter((e) => e.id !== splitTabId)
    const splitEntries = activeEntries.filter((e) => e.id === splitTabId)

    return (
      <div className="relative h-full flex">
        {/* Primary panel */}
        <div
          className="relative h-full overflow-hidden split-panel"
          style={{ width: `${splitRatio * 100}%` }}
          onMouseDown={() => focusedPanel !== 'primary' && setFocusedPanel('primary')}
        >
          <div
            className="absolute inset-0 webview-container"
            style={{
              backgroundColor: showPrimarySpecial ? 'transparent' : 'var(--bg-solid-fallback)',
              transition: 'background-color 200ms'
            }}
          >
            {primaryEntries.map((entry) => {
              if (isSpecialPage(entry.initialUrl)) return null
              return (
                <WebViewInstance
                  key={entry.id}
                  tabId={entry.id}
                  isActive={entry.id === activeTabId && !showPrimarySpecial}
                  initialUrl={entry.initialUrl}
                />
              )
            })}
          </div>
          {showPrimarySpecial && activeTabUrl && (
            <div className="absolute inset-0 z-20">
              <SpecialPage url={activeTabUrl} />
            </div>
          )}
          {/* Focus indicator */}
          {focusedPanel === 'primary' && (
            <div className="absolute inset-0 z-[15] pointer-events-none rounded-sm ring-2 ring-inset ring-indigo-500/25" />
          )}
        </div>

        {/* Divider rendered by BrowserLayout via SplitDivider */}
        <div className="split-divider-slot w-0 flex-shrink-0" />

        {/* Split panel */}
        <div
          className="relative h-full overflow-hidden split-panel"
          style={{ width: `${(1 - splitRatio) * 100}%` }}
          onMouseDown={() => focusedPanel !== 'split' && setFocusedPanel('split')}
        >
          <div
            className="absolute inset-0 webview-container"
            style={{
              backgroundColor: showSplitSpecial ? 'transparent' : 'var(--bg-solid-fallback)',
              transition: 'background-color 200ms'
            }}
          >
            {splitEntries.map((entry) => {
              if (isSpecialPage(entry.initialUrl)) return null
              return (
                <WebViewInstance
                  key={entry.id}
                  tabId={entry.id}
                  isActive={entry.id === splitTabId && !showSplitSpecial}
                  initialUrl={entry.initialUrl}
                />
              )
            })}
          </div>
          {showSplitSpecial && splitTabUrl && (
            <div className="absolute inset-0 z-20">
              <SpecialPage url={splitTabUrl} />
            </div>
          )}
          {focusedPanel === 'split' && (
            <div className="absolute inset-0 z-[15] pointer-events-none rounded-sm ring-2 ring-inset ring-indigo-500/25" />
          )}
        </div>
      </div>
    )
  }

  // Single-panel mode (no split)
  return (
    <div className="relative h-full">
      <div
        className="absolute inset-0 webview-container"
        style={{
          backgroundColor: showPrimarySpecial ? 'transparent' : 'var(--bg-solid-fallback)',
          transition: 'background-color 200ms'
        }}
      >
        {activeEntries.map((entry) => {
          if (isSpecialPage(entry.initialUrl)) return null
          return (
            <WebViewInstance
              key={entry.id}
              tabId={entry.id}
              isActive={entry.id === activeTabId && !showPrimarySpecial}
              initialUrl={entry.initialUrl}
            />
          )
        })}
      </div>

      {showPrimarySpecial && activeTabUrl && (
        <div className="absolute inset-0 z-20">
          <SpecialPage url={activeTabUrl} />
        </div>
      )}
    </div>
  )
}

export const WebViewManager = memo(WebViewManagerInner)
