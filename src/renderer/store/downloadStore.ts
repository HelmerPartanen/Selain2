import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIPCStorage } from './ipcStorage'
import { logger } from '@/utils/logger'

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
  isPrivate?: boolean
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

/** Shape of the state that is actually written to disk (partialize output) */
type PersistedDownloadState = { downloads: Record<string, DownloadItem> }

const MAX_PERSISTED_DOWNLOADS = 50

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => ({
      downloads: {},

      addDownload: (item) => {
        set((state) => {
          const downloads = { ...state.downloads, [item.id]: item }
          // Enforce max downloads limit by removing oldest ones
          const entries = Object.entries(downloads).sort((a, b) => b[1].startTime - a[1].startTime)
          if (entries.length > MAX_PERSISTED_DOWNLOADS) {
            entries.slice(MAX_PERSISTED_DOWNLOADS).forEach(([id]) => delete downloads[id])
          }
          return { downloads }
        })
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
    }),
    {
      name: 'download-history',
      version: 1,
      storage: createIPCStorage<PersistedDownloadState>({
        onParseError(name) {
          logger.error(`[downloadStore] Corrupted persisted data for '${name}' detected; starting with empty download history`)
        }
      }),
      partialize: (state): PersistedDownloadState => {
        // Only persist completed/failed/cancelled downloads (not active ones)
        // Limit to MAX_PERSISTED_DOWNLOADS most recent
        const finished = Object.values(state.downloads)
          .filter((d) => d.state === 'completed' || d.state === 'failed' || d.state === 'cancelled')
          .filter((d) => !d.isPrivate)
          .sort((a, b) => b.startTime - a.startTime)
          .slice(0, MAX_PERSISTED_DOWNLOADS)
        return {
          downloads: Object.fromEntries(finished.map((d) => [d.id, { ...d, speed: 0 }]))
        }
      }
    }
  )
)
