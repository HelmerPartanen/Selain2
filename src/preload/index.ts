import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from './types'

const api: ElectronAPI = {
  getPerfSnapshot: () => ipcRenderer.invoke('perf-get-snapshot'),
  getPerfSnapshots: (limit?: number) => ipcRenderer.invoke('perf-get-snapshots', limit),
  startPerfMonitor: (intervalMs?: number) => ipcRenderer.invoke('perf-start-monitor', intervalMs),
  stopPerfMonitor: () => ipcRenderer.invoke('perf-stop-monitor'),
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
  },
  setZoomFactor: (factor: number) => ipcRenderer.send('set-zoom-factor', factor),
  loadStore: (name: string) => ipcRenderer.invoke('load-store', name),
  saveStore: (name: string, data: string) => ipcRenderer.invoke('save-store', name, data),
  clearStoresSync: (names: string[]) => ipcRenderer.sendSync('clear-stores-sync', names) as boolean,
  requestPiP: (webContentsId: number) => ipcRenderer.send('request-pip', webContentsId),
  fetchSearchSuggestions: (query: string) => ipcRenderer.invoke('fetch-search-suggestions', query),
  captureTab: (webContentsId: number) => ipcRenderer.invoke('capture-tab', webContentsId),
  // ── AI / Ollama ──────────────────────────────────────────────────────────
  checkAIStatus: () => ipcRenderer.invoke('ai:check-status'),
  pullAIModel: () => ipcRenderer.invoke('ai:pull-model'),
  cancelAIPull: () => ipcRenderer.send('ai:cancel-pull'),
  onAIPullProgress: (callback: (data: { status: string; progress: number; total: number; completed: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { status: string; progress: number; total: number; completed: number }): void => {
      callback(data)
    }
    ipcRenderer.on('ai:pull-progress', handler)
    return () => { ipcRenderer.removeListener('ai:pull-progress', handler) }
  },
  onAIPullDone: (callback: (data: { success: boolean; error?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { success: boolean; error?: string }): void => {
      callback(data)
    }
    ipcRenderer.on('ai:pull-done', handler)
    return () => { ipcRenderer.removeListener('ai:pull-done', handler) }
  },
  summarizePage: (text: string) => ipcRenderer.send('ai:summarize', text),
  cancelSummarize: () => ipcRenderer.send('ai:cancel-summarize'),
  onAISummaryChunk: (callback: (token: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, token: string): void => {
      callback(token)
    }
    ipcRenderer.on('ai:summary-chunk', handler)
    return () => { ipcRenderer.removeListener('ai:summary-chunk', handler) }
  },
  onAISummaryDone: (callback: (data: { success: boolean; error?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { success: boolean; error?: string }): void => {
      callback(data)
    }
    ipcRenderer.on('ai:summary-done', handler)
    return () => { ipcRenderer.removeListener('ai:summary-done', handler) }
  },
}

// Freeze the API object so renderer code cannot mutate or extend it
contextBridge.exposeInMainWorld('electronAPI', Object.freeze(api))
