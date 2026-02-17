import { useShallow } from 'zustand/react/shallow'
import { useTabStore } from '@/store/tabStore'

export function useActiveTabId(): string | null {
  return useTabStore((s) => s.activeTabId)
}

export function useSplitTabId(): string | null {
  return useTabStore((s) => s.splitTabId)
}

export function useIsSplitView(): boolean {
  return useTabStore((s) => s.splitTabId !== null)
}

/** Returns the tab ID of whichever panel is focused (primary or split) */
export function useFocusedTabId(): string | null {
  return useTabStore((s) => {
    if (s.focusedPanel === 'split' && s.splitTabId) return s.splitTabId
    return s.activeTabId
  })
}

export function useTabOrder(): string[] {
  return useTabStore(useShallow((s) => s.tabOrder))
}

/** Subscribe only to the focused tab's URL — avoids rerenders on title/favicon/loading changes */
export function useFocusedTabUrl(): string {
  return useTabStore((s) => {
    const id = s.focusedPanel === 'split' && s.splitTabId ? s.splitTabId : s.activeTabId
    if (!id) return ''
    return s.tabs[id]?.url ?? ''
  })
}

/** Legacy: subscribe only to the active tab's URL */
export function useActiveTabUrl(): string {
  return useTabStore((s) => {
    if (!s.activeTabId) return ''
    return s.tabs[s.activeTabId]?.url ?? ''
  })
}

/** Subscribe only to navigation-relevant fields of the focused tab */
export function useFocusedTabNavState(): {
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
  loadProgress: number
} {
  return useTabStore(
    useShallow((s) => {
      const id = s.focusedPanel === 'split' && s.splitTabId ? s.splitTabId : s.activeTabId
      if (!id) return { isLoading: false, canGoBack: false, canGoForward: false, loadProgress: 0 }
      const tab = s.tabs[id]
      if (!tab) return { isLoading: false, canGoBack: false, canGoForward: false, loadProgress: 0 }
      return {
        isLoading: tab.isLoading,
        canGoBack: tab.canGoBack,
        canGoForward: tab.canGoForward,
        loadProgress: tab.loadProgress
      }
    })
  )
}

/** Legacy alias */
export function useActiveTabNavState(): {
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
} {
  return useFocusedTabNavState()
}

export function useTabMeta(id: string): { title: string; favicon: string; isLoading: boolean; isPlayingMedia: boolean } | undefined {
  return useTabStore(
    useShallow((s) => {
      const tab = s.tabs[id]
      if (!tab) return undefined
      return { title: tab.title, favicon: tab.favicon, isLoading: tab.isLoading, isPlayingMedia: tab.isPlayingMedia }
    })
  )
}

/** Subscribe only to favicon + loading state (avoids re-renders on title changes) */
export function useTabFaviconState(id: string): { favicon: string; isLoading: boolean } | undefined {
  return useTabStore(
    useShallow((s) => {
      const tab = s.tabs[id]
      if (!tab) return undefined
      return { favicon: tab.favicon, isLoading: tab.isLoading }
    })
  )
}

/** Returns true if any background (non-active, non-split) tab is currently playing media */
export function useBackgroundMediaPlaying(): boolean {
  return useTabStore((s) => {
    for (const id of s.tabOrder) {
      if (id === s.activeTabId) continue
      if (id === s.splitTabId) continue
      if (s.tabs[id]?.isPlayingMedia) return true
    }
    return false
  })
}


