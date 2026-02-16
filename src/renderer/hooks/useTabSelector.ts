import { useShallow } from 'zustand/react/shallow'
import { useTabStore } from '@/store/tabStore'
import type { Tab } from '@/store/tabStore'

export function useActiveTabId(): string | null {
  return useTabStore((s) => s.activeTabId)
}

export function useTabOrder(): string[] {
  return useTabStore(useShallow((s) => s.tabOrder))
}

export function useTabById(id: string): Tab | undefined {
  return useTabStore(useShallow((s) => s.tabs[id]))
}

export function useActiveTab(): Tab | undefined {
  return useTabStore(
    useShallow((s) => {
      if (!s.activeTabId) return undefined
      return s.tabs[s.activeTabId]
    })
  )
}

export function useTabMeta(id: string): { title: string; favicon: string; isLoading: boolean } | undefined {
  return useTabStore(
    useShallow((s) => {
      const tab = s.tabs[id]
      if (!tab) return undefined
      return { title: tab.title, favicon: tab.favicon, isLoading: tab.isLoading }
    })
  )
}

export function useTabActions() {
  return useTabStore(
    useShallow((s) => ({
      addTab: s.addTab,
      removeTab: s.removeTab,
      setActiveTab: s.setActiveTab,
      updateTab: s.updateTab,
      reorderTab: s.reorderTab
    }))
  )
}
