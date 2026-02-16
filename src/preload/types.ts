export interface ElectronAPI {
  minimizeWindow(): void
  maximizeWindow(): void
  closeWindow(): void
  toggleMaximizeWindow(): void
  onMaximizeChange(callback: (isMaximized: boolean) => void): () => void
  /** Opens a native file dialog to pick an image; returns a data URL or null */
  openImageDialog(): Promise<string | null>
  /** Updates the Windows title bar overlay color to match the theme */
  setTitleBarColor(hex: string): void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
