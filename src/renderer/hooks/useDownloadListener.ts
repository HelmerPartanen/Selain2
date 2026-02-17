import { useEffect } from 'react'
import { useDownloadStore } from '@/store/downloadStore'

/**
 * Subscribes to download IPC events from main process and updates the download store.
 * Should be mounted once at the app root (BrowserLayout).
 */
export function useDownloadListener(): void {
  useEffect(() => {
    const api = window.electronAPI

    const offStarted = api.onDownloadStarted((item) => {
      useDownloadStore.getState().addDownload({
        id: item.id,
        filename: item.filename,
        url: item.url,
        savePath: item.savePath,
        totalBytes: item.totalBytes,
        receivedBytes: 0,
        state: 'progressing',
        startTime: Date.now(),
        speed: 0
      })
    })

    const offProgress = api.onDownloadProgress((data) => {
      useDownloadStore.getState().updateProgress(
        data.id,
        data.receivedBytes,
        data.totalBytes,
        data.speed
      )
    })

    const offDone = api.onDownloadDone((data) => {
      useDownloadStore.getState().updateState(data.id, data.state)
    })

    return () => {
      offStarted()
      offProgress()
      offDone()
    }
  }, [])
}
