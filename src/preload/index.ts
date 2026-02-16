import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from './types'

const validChannels = new Set([
  'window-minimize',
  'window-maximize',
  'window-close',
  'window-toggle-maximize'
] as const)

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
  }
}

// Freeze the API object so renderer code cannot mutate or extend it
contextBridge.exposeInMainWorld('electronAPI', Object.freeze(api))
