// ── useAISetup ────────────────────────────────────────────────────────────────
// Registers IPC listeners for AI pull progress / done events.
// Mount once at the app root (BrowserLayout).

import { useEffect } from 'react'
import { useAIStore } from '@/store/aiStore'

export function useAISetup(): void {
  useEffect(() => {
    const api = window.electronAPI
    const store = useAIStore.getState()

    const offProgress = api.onAIPullProgress((data) => {
      store._onProgress(data)
    })

    const offDone = api.onAIPullDone((data) => {
      store._onDone(data)
    })

    const offChunk = api.onAISummaryChunk((token) => {
      useAIStore.getState()._onChunk(token)
    })

    const offSummaryDone = api.onAISummaryDone((data) => {
      useAIStore.getState()._onSummaryDone(data)
    })

    return () => {
      offProgress()
      offDone()
      offChunk()
      offSummaryDone()
    }
  }, [])
}
