import { useShallow } from 'zustand/react/shallow'
import { useTabStore } from '@/store/tabStore'
import { useSpaceStore } from '@/store/spaceStore'

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

export function useFocusedTabIsPrivate(): boolean {
  return useTabStore((s) => {
    const id = s.focusedPanel === 'split' && s.splitTabId ? s.splitTabId : s.activeTabId
    if (!id) return false
    return s.tabs[id]?.isPrivate ?? false
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
      // Include virtual history in effective canGoBack/canGoForward
      const isSpecial = tab.url === 'browser://newtab'
      return {
        isLoading: tab.isLoading,
        canGoBack: tab.canGoBack || !!tab.virtualBackUrl,
        canGoForward: tab.canGoForward || (isSpecial && !!tab.virtualForwardUrl),
        loadProgress: tab.loadProgress
      }
    })
  )
}

/** Subscribe only to focused-tab back/forward capability (stable for toolbar controls) */
export function useFocusedTabCanNavigate(): { canGoBack: boolean; canGoForward: boolean } {
  return useTabStore(
    useShallow((s) => {
      const id = s.focusedPanel === 'split' && s.splitTabId ? s.splitTabId : s.activeTabId
      if (!id) return { canGoBack: false, canGoForward: false }
      const tab = s.tabs[id]
      if (!tab) return { canGoBack: false, canGoForward: false }
      const isSpecial = tab.url === 'browser://newtab'
      return {
        canGoBack: tab.canGoBack || !!tab.virtualBackUrl,
        canGoForward: tab.canGoForward || (isSpecial && !!tab.virtualForwardUrl)
      }
    })
  )
}

export function useTabMeta(id: string): { title: string; favicon: string; isLoading: boolean; isPlayingMedia: boolean; isMuted: boolean; pinned: boolean; isPrivate: boolean } | undefined {
  return useTabStore(
    useShallow((s) => {
      const tab = s.tabs[id]
      if (!tab) return undefined
      return { title: tab.title, favicon: tab.favicon, isLoading: tab.isLoading, isPlayingMedia: tab.isPlayingMedia, isMuted: tab.isMuted, pinned: tab.pinned, isPrivate: tab.isPrivate }
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

/** Returns true if the focused tab is currently playing media */
export function useFocusedTabMediaPlaying(): boolean {
  return useTabStore((s) => {
    const id = s.focusedPanel === 'split' && s.splitTabId ? s.splitTabId : s.activeTabId
    if (!id) return false
    return s.tabs[id]?.isPlayingMedia ?? false
  })
}

/** Returns tab order filtered to the active space's tabs */
export function useSpaceTabOrder(): string[] {
  const tabOrder = useTabStore(useShallow((s) => s.tabOrder))
  const spaceTabIds = useSpaceStore(
    useShallow((s) => s.spaces[s.activeSpaceId]?.tabIds ?? [])
  )
  const spaceSet = new Set(spaceTabIds)
  return tabOrder.filter((id) => spaceSet.has(id))
}

/** Returns tab IDs belonging to a specific space (filtered by tabStore.tabOrder) */
export function useSpaceTabIds(spaceId: string): string[] {
  const tabOrder = useTabStore(useShallow((s) => s.tabOrder))
  const spaceTabIds = useSpaceStore(
    useShallow((s) => s.spaces[spaceId]?.tabIds ?? [])
  )
  const spaceSet = new Set(spaceTabIds)
  return tabOrder.filter((id) => spaceSet.has(id))
}


