import { useEffect, useRef } from 'react'
import { useTabStore } from '@/store/tabStore'

const MAX_ALIVE_TABS = 10
/** Keep thumbnails only for this many most-recently-used tabs to bound RAM. */
const MAX_TAB_THUMBNAILS = 16

export function useLRUTabManager(): void {
  const recentOrderRef = useRef<string[]>([])

  useEffect(() => {
    // Subscribe to both activeTabId and splitTabId changes
    const unsub = useTabStore.subscribe(
      (s) => ({ activeTabId: s.activeTabId, splitTabId: s.splitTabId }),
      ({ activeTabId, splitTabId }) => {
        const recent = recentOrderRef.current

        // Bump split tab to front first, then active (active ends up at index 0)
        let filtered = recent.filter((id) => id !== activeTabId && id !== splitTabId)
        if (splitTabId) filtered.unshift(splitTabId)
        if (activeTabId) filtered.unshift(activeTabId)
        recentOrderRef.current = filtered

        const state = useTabStore.getState()
        const existingIds = new Set(state.tabOrder)
        recentOrderRef.current = recentOrderRef.current.filter((id) => existingIds.has(id))

        const protectedIds = new Set<string>()
        if (activeTabId) protectedIds.add(activeTabId)
        if (splitTabId) protectedIds.add(splitTabId)

        if (recentOrderRef.current.length > MAX_ALIVE_TABS) {
          const toSuspend = recentOrderRef.current.slice(MAX_ALIVE_TABS)
          for (const id of toSuspend) {
            const tab = state.tabs[id]
            if (tab && !tab.isSuspended && !protectedIds.has(id)) {
              state.suspendTab(id)
            }
          }
        }

        // Cap in-memory thumbnails: clear oldest beyond MAX_TAB_THUMBNAILS to bound RAM
        const order = recentOrderRef.current
        if (order.length > MAX_TAB_THUMBNAILS) {
          const toClear = order.slice(MAX_TAB_THUMBNAILS)
          for (const id of toClear) {
            if (protectedIds.has(id)) continue
            const tab = state.tabs[id]
            if (tab?.thumbnail) {
              state.updateTab(id, { thumbnail: null })
            }
          }
        }
      },
      { equalityFn: (a, b) => a.activeTabId === b.activeTabId && a.splitTabId === b.splitTabId }
    )

    return unsub
  }, [])
}
