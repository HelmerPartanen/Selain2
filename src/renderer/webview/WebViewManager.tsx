import { memo, useMemo, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useTabStore } from '@/store/tabStore'
import { WebViewInstance } from './WebViewInstance'

interface WebViewEntry {
  id: string
  initialUrl: string
  isSuspended: boolean
}

function WebViewManagerInner(): React.JSX.Element {
  const activeTabId = useTabStore((s) => s.activeTabId)

  // Track which tabs have been mounted so we don't send new initialUrl on re-render.
  // initialUrl is only used at mount time; subsequent navigations are handled
  // by the store subscription inside WebViewInstance.
  const mountedUrlsRef = useRef<Record<string, string>>({})

  const tabStructure = useTabStore(
    useShallow((s) =>
      s.tabOrder
        .map((id) => {
          const tab = s.tabs[id]
          if (!tab) return null
          return { id: tab.id, isSuspended: tab.isSuspended, url: tab.url }
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
    )
  )

  const activeEntries = useMemo(() => {
    const result: WebViewEntry[] = []
    for (const entry of tabStructure) {
      if (entry.isSuspended) {
        delete mountedUrlsRef.current[entry.id]
        continue
      }
      // Only use the URL on first mount; keep original for already-mounted tabs
      if (!mountedUrlsRef.current[entry.id]) {
        mountedUrlsRef.current[entry.id] = entry.url
      }
      result.push({
        id: entry.id,
        initialUrl: mountedUrlsRef.current[entry.id],
        isSuspended: false
      })
    }
    return result
  }, [tabStructure])

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
