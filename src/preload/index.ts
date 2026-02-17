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
  },
  downloadAction: (action: string, id: string, savePath?: string) => ipcRenderer.send('download-action', action, id, savePath),
  onDownloadStarted: (callback: (item: { id: string; filename: string; url: string; savePath: string; totalBytes: number; receivedBytes: number; startTime: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, item: { id: string; filename: string; url: string; savePath: string; totalBytes: number; receivedBytes: number; startTime: number }): void => {
      callback(item)
    }
    ipcRenderer.on('download-started', handler)
    return () => { ipcRenderer.removeListener('download-started', handler) }
  },
  onDownloadProgress: (callback: (data: { id: string; receivedBytes: number; totalBytes: number; speed: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; receivedBytes: number; totalBytes: number; speed: number }): void => {
      callback(data)
    }
    ipcRenderer.on('download-progress', handler)
    return () => { ipcRenderer.removeListener('download-progress', handler) }
  },
  onDownloadDone: (callback: (data: { id: string; state: 'completed' | 'cancelled' | 'failed' }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; state: 'completed' | 'cancelled' | 'failed' }): void => {
      callback(data)
    }
    ipcRenderer.on('download-done', handler)
    return () => { ipcRenderer.removeListener('download-done', handler) }
  },
  onOpenUrlInNewTab: (callback: (url: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, url: string): void => {
      callback(url)
    }
    ipcRenderer.on('open-url-in-new-tab', handler)
    return () => { ipcRenderer.removeListener('open-url-in-new-tab', handler) }
  }
}

// Freeze the API object so renderer code cannot mutate or extend it
contextBridge.exposeInMainWorld('electronAPI', Object.freeze(api))
