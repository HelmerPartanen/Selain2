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

  /** Capture a screenshot of the webview as a data URL */
  async capturePage(tabId: string): Promise<string | null> {
    const webview = registry.get(tabId)
    if (!webview) return null
    try {
      const img = await (webview as unknown as { capturePage(): Promise<Electron.NativeImage> }).capturePage()
      return img.toDataURL()
    } catch {
      return null
    }
  }
} as const
