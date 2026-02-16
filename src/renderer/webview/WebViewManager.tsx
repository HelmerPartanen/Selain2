import { memo, useCallback, useRef, useSyncExternalStore } from 'react'
import { useTabStore } from '@/store/tabStore'
import { WebViewInstance } from './WebViewInstance'

interface WebViewEntry {
  id: string
  initialUrl: string
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

  return (
    <div className="relative flex-1 bg-surface">
      {activeEntries.map((entry) => (
        <WebViewInstance
          key={entry.id}
          tabId={entry.id}
          isActive={entry.id === activeTabId}
          initialUrl={entry.initialUrl}
        />
      ))}
    </div>
  )
}

export const WebViewManager = memo(WebViewManagerInner)
