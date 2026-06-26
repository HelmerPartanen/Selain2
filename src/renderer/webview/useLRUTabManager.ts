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

        // Suspend the cold tail of the LRU.
        if (recentOrderRef.current.length > MAX_ALIVE_TABS) {
          const toSuspend = recentOrderRef.current.slice(MAX_ALIVE_TABS)
          for (const id of toSuspend) {
            const tab = state.tabs[id]
            if (tab && !tab.isSuspended && !protectedIds.has(id)) {
              state.suspendTab(id)
            }
          }
        }

        // Batch thumbnail clearing into a single store mutation so we don't
        // fire N re-renders when 20 tabs lose their cached previews at once.
        const order = recentOrderRef.current
        const toClear = new Set<string>()

        if (order.length > MAX_TAB_THUMBNAILS) {
          for (const id of order.slice(MAX_TAB_THUMBNAILS)) {
            if (!protectedIds.has(id)) toClear.add(id)
          }
        }
        // Aggressively drop thumbnails for already-suspended tabs.
        for (const id of state.tabOrder) {
          const tab = state.tabs[id]
          if (tab && tab.isSuspended && tab.thumbnail && !protectedIds.has(id)) {
            toClear.add(id)
          }
        }

        if (toClear.size === 0) return

        useTabStore.setState((s) => {
          const nextTabs = { ...s.tabs }
          for (const id of toClear) {
            const tab = nextTabs[id]
            if (!tab || !tab.thumbnail) continue
            nextTabs[id] = { ...tab, thumbnail: null }
          }
          return { tabs: nextTabs }
        })
      },
      { equalityFn: (a, b) => a.activeTabId === b.activeTabId && a.splitTabId === b.splitTabId }
    )

    return unsub
  }, [])
}