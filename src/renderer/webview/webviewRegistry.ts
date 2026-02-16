/**
 * Global registry of mounted webview DOM references, keyed by tab ID.
 * Allows imperative access to any webview without DOM querying.
 * Lives outside React to avoid triggering re-renders.
 */
const registry = new Map<string, Electron.WebviewTag>()

export const webviewRegistry = {
  register(tabId: string, webview: Electron.WebviewTag): void {
    registry.set(tabId, webview)
  },

  unregister(tabId: string): void {
    registry.delete(tabId)
  },

  get(tabId: string): Electron.WebviewTag | undefined {
    return registry.get(tabId)
  },

  getActive(): Electron.WebviewTag | undefined {
    // Import here avoided — caller provides the activeTabId
    return undefined
  }
} as const
