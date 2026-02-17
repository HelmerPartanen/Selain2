import { memo, useCallback, useRef, useSyncExternalStore } from 'react'
import { useTabStore } from '@/store/tabStore'
import { WebViewInstance } from './WebViewInstance'
import { NewTabPage } from '@/newtab/NewTabPage'

interface WebViewEntry {
  id: string
  initialUrl: string
}

function isSpecialPage(url: string): boolean {
  return url === 'browser://newtab'
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

  // Track which tabs have been mounted so we don't send new initialUrl on re-render.
  const mountedUrlsRef = useRef<Record<string, string>>({})
  const prevEntriesRef = useRef<WebViewEntry[]>([])

  const subscribe = useCallback((cb: () => void) => useTabStore.subscribe(cb), [])

  const getSnapshot = useCallback((): WebViewEntry[] => {
    const { tabOrder, tabs } = useTabStore.getState()
    const result: WebViewEntry[] = []
    for (const id of tabOrder) {
      const tab = tabs[id]
      if (!tab || tab.isSuspended) {
        delete mountedUrlsRef.current[id]
        continue
      }
      // Don't create webview entries for special browser:// pages
      if (isSpecialPage(tab.url)) {
        delete mountedUrlsRef.current[id]
        continue
      }
      if (!mountedUrlsRef.current[id]) {
        mountedUrlsRef.current[id] = tab.url
      }
      result.push({ id, initialUrl: mountedUrlsRef.current[id] })
    }
    // Structural equality: only return a new array reference when the list actually changed
    const prev = prevEntriesRef.current
    if (
      prev.length === result.length &&
      prev.every((e, i) => result[i] !== undefined && e.id === result[i].id && e.initialUrl === result[i].initialUrl)
    ) {
      return prev
    }
    prevEntriesRef.current = result
    return result
  }, [])

  const activeEntries = useSyncExternalStore(subscribe, getSnapshot)

  // Get the active tab's current URL for special page rendering
  const activeTabUrl = useTabStore((s) => {
    if (!s.activeTabId) return null
    return s.tabs[s.activeTabId]?.url ?? null
  })

  const showSpecialPage = activeTabUrl ? isSpecialPage(activeTabUrl) : false

  return (
    <div className="relative h-full">
      {/* Webview container — solid background so web pages aren't transparent */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: showSpecialPage ? 'transparent' : 'var(--bg-solid-fallback)',
          transition: 'background-color 200ms'
        }}
      >
        {activeEntries.map((entry) => {
          if (isSpecialPage(entry.initialUrl)) return null
          return (
            <WebViewInstance
              key={entry.id}
              tabId={entry.id}
              isActive={entry.id === activeTabId && !showSpecialPage}
              initialUrl={entry.initialUrl}
            />
          )
        })}
      </div>

      {/* Special page overlay — transparent so wallpaper shows through */}
      {showSpecialPage && activeTabUrl && (
        <div className="absolute inset-0 z-20">
          <SpecialPage url={activeTabUrl} />
        </div>
      )}
    </div>
  )
}

export const WebViewManager = memo(WebViewManagerInner)
