export interface ElectronAPI {
  minimizeWindow(): void
  maximizeWindow(): void
  closeWindow(): void
  toggleMaximizeWindow(): void
  onMaximizeChange(callback: (isMaximized: boolean) => void): () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
