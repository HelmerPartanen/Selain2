import { useTabStore } from '@/store/tabStore'

/**
 * Navigate the currently active tab to the given URL.
 * No-op if there is no active tab.
 */
export function navigateActiveTab(url: string): void {
  const store = useTabStore.getState()
  if (store.activeTabId) {
    store.updateTab(store.activeTabId, { url })
  }
}
