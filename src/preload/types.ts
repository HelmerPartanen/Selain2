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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
