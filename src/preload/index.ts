import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from './types'

const api: ElectronAPI = {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  toggleMaximizeWindow: () => ipcRenderer.send('window-toggle-maximize'),
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void => {
      callback(isMaximized)
    }
    ipcRenderer.on('maximize-change', handler)
    return () => {
      ipcRenderer.removeListener('maximize-change', handler)
    }
  },
  openImageDialog: () => ipcRenderer.invoke('open-image-dialog'),
  saveWallpaper: (dataUrl: string | null) => ipcRenderer.invoke('save-wallpaper', dataUrl),
  loadWallpaper: () => ipcRenderer.invoke('load-wallpaper'),
  onShortcutPressed: (callback: (shortcut: { key: string; code: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, shortcut: { key: string; code: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): void => {
      callback(shortcut)
    }
    ipcRenderer.on('shortcut-pressed', handler)
    return () => {
      ipcRenderer.removeListener('shortcut-pressed', handler)
    }
  }
}

// Freeze the API object so renderer code cannot mutate or extend it
contextBridge.exposeInMainWorld('electronAPI', Object.freeze(api))
