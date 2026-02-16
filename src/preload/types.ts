export interface ElectronAPI {
  minimizeWindow(): void
  maximizeWindow(): void
  closeWindow(): void
  toggleMaximizeWindow(): void
  onMaximizeChange(callback: (isMaximized: boolean) => void): () => void
  /** Opens a native file dialog to pick an image; returns a data URL or null */
  openImageDialog(): Promise<string | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
