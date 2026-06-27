/**
 * Global registry of mounted webview DOM references, keyed by tab ID.
 * Allows imperative access to any webview without DOM querying.
 * Lives outside React to avoid triggering re-renders.
 */
const registry = new Map<string, Electron.WebviewTag>()
const THUMBNAIL_JPEG_QUALITY = 62

export const webviewRegistry = {
  register(tabId: string, webview: Electron.WebviewTag): void {
    registry.set(tabId, webview)
  },

  unregister(tabId: string): void {
    registry.delete(tabId)
  },

  destroy(tabId: string): void {
    const webview = registry.get(tabId)
    registry.delete(tabId)
    if (!webview) return

    try {
      const webContentsId = (webview as unknown as { getWebContentsId?(): number }).getWebContentsId?.()
      if (webContentsId !== undefined) {
        void window.electronAPI.destroyWebview(webContentsId)
      }
    } catch {
      // The guest may already be gone; cleanup is best-effort.
    }
  },

  get(tabId: string): Electron.WebviewTag | undefined {
    return registry.get(tabId)
  },

  /** Capture a screenshot of the webview as a data URL */
  async capturePage(tabId: string): Promise<string | null> {
    const webview = registry.get(tabId)
    if (!webview) return null
    try {
      // Guard: if the webview's webContents is destroyed, native capturePage object leak crashes renderer
      const wc = (webview as unknown as { getWebContentsId?(): number }).getWebContentsId?.()
      if (wc === undefined) return null

      // Use IPC to run capturePage in the main process
      return await window.electronAPI.captureTab(wc)
    } catch {
      return null
    }
  }
} as const
