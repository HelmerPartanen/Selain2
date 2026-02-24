import { useTabStore } from '@/store/tabStore'

/**
 * Navigate the currently focused tab to the given URL.
 * In split view this targets the focused panel tab; otherwise the active tab.
 */
export function navigateActiveTab(url: string): void {
  const store = useTabStore.getState()
  const targetTabId =
    store.focusedPanel === 'split' && store.splitTabId
      ? store.splitTabId
      : store.activeTabId

  if (targetTabId) {
    store.updateTab(targetTabId, { url })
  }
}
