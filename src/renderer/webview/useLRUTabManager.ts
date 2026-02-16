import { useEffect, useRef } from 'react'
import { useTabStore } from '@/store/tabStore'

const MAX_ALIVE_TABS = 10

export function useLRUTabManager(): void {
  const recentOrderRef = useRef<string[]>([])

  useEffect(() => {
    const unsub = useTabStore.subscribe(
      (s) => s.activeTabId,
      (activeTabId) => {
        if (!activeTabId) return

        const recent = recentOrderRef.current
        const filtered = recent.filter((id) => id !== activeTabId)
        filtered.unshift(activeTabId)
        recentOrderRef.current = filtered

        const state = useTabStore.getState()
        const existingIds = new Set(state.tabOrder)
        recentOrderRef.current = recentOrderRef.current.filter((id) => existingIds.has(id))

        if (recentOrderRef.current.length > MAX_ALIVE_TABS) {
          const toSuspend = recentOrderRef.current.slice(MAX_ALIVE_TABS)
          for (const id of toSuspend) {
            const tab = state.tabs[id]
            if (tab && !tab.isSuspended && id !== activeTabId) {
              state.suspendTab(id)
            }
          }
        }
      }
    )

    return unsub
  }, [])
}
