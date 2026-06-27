import { useEffect } from 'react'
import { useDownloadStore } from '@/store/downloadStore'
import { showToast } from '@/components/ui/toastStore'

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
        speed: 0,
        isPrivate: item.isPrivate
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

      // Show toast notification for completed downloads
      if (data.state === 'completed') {
        const dl = useDownloadStore.getState().downloads[data.id]
        if (dl) {
          showToast({
            message: `${dl.filename} downloaded`,
            type: 'success',
            action: {
              label: 'Open',
              onClick: () => useDownloadStore.getState().openDownload(data.id)
            }
          })
        }
      } else if (data.state === 'failed') {
        const dl = useDownloadStore.getState().downloads[data.id]
        showToast({
          message: `${dl?.filename ?? 'Download'} failed`,
          type: 'error'
        })
      }
    })

    return () => {
      offStarted()
      offProgress()
      offDone()
    }
  }, [])
}
