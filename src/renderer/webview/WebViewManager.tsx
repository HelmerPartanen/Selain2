import { memo, useMemo, useRef } from 'react'
import { useTabStore } from '@/store/tabStore'
import { WebViewInstance } from './WebViewInstance'

interface WebViewEntry {
  id: string
  initialUrl: string
  isSuspended: boolean
}

function WebViewManagerInner(): React.JSX.Element {
  const activeTabId = useTabStore((s) => s.activeTabId)
  const tabOrder = useTabStore((s) => s.tabOrder)
  const tabs = useTabStore((s) => s.tabs)

  // Track which tabs have been mounted so we don't send new initialUrl on re-render.
  // initialUrl is only used at mount time; subsequent navigations are handled
  // by the store subscription inside WebViewInstance.
  const mountedUrlsRef = useRef<Record<string, string>>({})

  const activeEntries = useMemo(() => {
    const result: WebViewEntry[] = []
    for (const id of tabOrder) {
      const tab = tabs[id]
      if (!tab) continue
      if (tab.isSuspended) {
        delete mountedUrlsRef.current[id]
        continue
      }
      // Only use the URL on first mount; keep original for already-mounted tabs
      if (!mountedUrlsRef.current[id]) {
        mountedUrlsRef.current[id] = tab.url
      }
      result.push({
        id: tab.id,
        initialUrl: mountedUrlsRef.current[id],
        isSuspended: false
      })
    }
    return result
  }, [tabOrder, tabs])

  return (
    <div className="relative flex-1 bg-zinc-950">
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
