export interface ElectronAPI {
  minimizeWindow(): void
  maximizeWindow(): void
  closeWindow(): void
  toggleMaximizeWindow(): void
  onMaximizeChange(callback: (isMaximized: boolean) => void): () => void
  /** Opens a native file dialog to pick an image; returns a data URL or null */
  openImageDialog(): Promise<string | null>
  /** Persist wallpaper data URL to disk (null to clear) */
  saveWallpaper(dataUrl: string | null): Promise<boolean>
  /** Load persisted wallpaper data URL from disk */
  loadWallpaper(): Promise<string | null>
  /** Listen for keyboard shortcuts forwarded from the main process (for webview-focused shortcuts) */
  onShortcutPressed(callback: (shortcut: { key: string; code: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }) => void): () => void
  /** Download management */
  downloadAction(action: 'pause' | 'resume' | 'cancel' | 'open' | 'show-in-folder', id: string, savePath?: string): void
  onDownloadStarted(callback: (item: { id: string; filename: string; url: string; savePath: string; totalBytes: number; receivedBytes: number; startTime: number }) => void): () => void
  onDownloadProgress(callback: (data: { id: string; receivedBytes: number; totalBytes: number; speed: number }) => void): () => void
  onDownloadDone(callback: (data: { id: string; state: 'completed' | 'cancelled' | 'failed' }) => void): () => void
  /** Listen for URLs that should open in a new tab (from webview window.open / target="_blank") */
  onOpenUrlInNewTab(callback: (url: string) => void): () => void
  /** Capture the main window content as a data URL */
  capturePage(): Promise<string | null>
  /** Set the renderer zoom factor (1.0 = 100%) */
  setZoomFactor(factor: number): void
  /** Load persisted store data from filesystem */
  loadStore(name: string): Promise<string | null>
  /** Save store data to filesystem */
  saveStore(name: string, data: string): Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
