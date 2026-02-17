import { create } from 'zustand'

export interface DownloadItem {
  id: string
  filename: string
  url: string
  savePath: string
  totalBytes: number
  receivedBytes: number
  state: 'progressing' | 'completed' | 'cancelled' | 'failed' | 'paused'
  startTime: number
  speed: number
}

interface DownloadState {
  downloads: Record<string, DownloadItem>
  addDownload: (item: DownloadItem) => void
  updateProgress: (id: string, receivedBytes: number, totalBytes: number, speed: number) => void
  updateState: (id: string, state: DownloadItem['state']) => void
  removeDownload: (id: string) => void
  pauseDownload: (id: string) => void
  resumeDownload: (id: string) => void
  cancelDownload: (id: string) => void
  openDownload: (id: string) => void
  showInFolder: (id: string) => void
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  downloads: {},

  addDownload: (item) => {
    set((state) => ({
      downloads: { ...state.downloads, [item.id]: item }
    }))
  },

  updateProgress: (id, receivedBytes, totalBytes, speed) => {
    set((state) => {
      const dl = state.downloads[id]
      if (!dl) return state
      return {
        downloads: {
          ...state.downloads,
          [id]: { ...dl, receivedBytes, totalBytes, speed }
        }
      }
    })
  },

  updateState: (id, newState) => {
    set((state) => {
      const dl = state.downloads[id]
      if (!dl) return state
      return {
        downloads: {
          ...state.downloads,
          [id]: { ...dl, state: newState, speed: 0 }
        }
      }
    })
  },

  removeDownload: (id) => {
    set((state) => {
      const { [id]: _, ...rest } = state.downloads
      return { downloads: rest }
    })
  },

  pauseDownload: (id) => {
    window.electronAPI.downloadAction('pause', id)
  },

  resumeDownload: (id) => {
    window.electronAPI.downloadAction('resume', id)
  },

  cancelDownload: (id) => {
    window.electronAPI.downloadAction('cancel', id)
  },

  openDownload: (id) => {
    const dl = get().downloads[id]
    if (dl) window.electronAPI.downloadAction('open', id, dl.savePath)
  },

  showInFolder: (id) => {
    const dl = get().downloads[id]
    if (dl) window.electronAPI.downloadAction('show-in-folder', id, dl.savePath)
  }
}))
