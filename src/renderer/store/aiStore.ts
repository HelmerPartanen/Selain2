// ── AI Store ──────────────────────────────────────────────────────────────────
// State machine for Ollama installation and model availability.
//
// State flow:
//   idle → checking → missing-ollama  (Ollama not found)
//                  → missing-model    (installed, model not pulled)
//                  → ready            (model available)
//          missing-model → downloading → ready | error
//          error → checking           (retry)

import { create } from 'zustand'

export type AIStatus =
  | 'idle'           // not yet checked
  | 'checking'       // running the status check
  | 'missing-ollama' // binary not installed
  | 'service-down'   // binary exists but service not running
  | 'missing-model'  // service up, model not pulled
  | 'downloading'    // pull in progress
  | 'ready'          // model available, AI features enabled
  | 'error'          // unexpected failure

export interface AIPullProgress {
  status: string
  progress: number   // 0–100
  total: number      // bytes
  completed: number  // bytes
}

interface AIState {
  status: AIStatus
  error: string | null
  pullProgress: AIPullProgress | null
  summary: string
  isSummarizing: boolean
  summaryError: string | null
}

interface AIActions {
  /** Run a full Ollama + model status check */
  checkStatus(): Promise<void>
  /** Begin pulling the model (noop if already downloading) */
  startDownload(): Promise<void>
  /** Cancel an in-progress pull */
  cancelDownload(): void
  /** Start summarizing the given page text */
  startSummary(pageText: string): void
  /** Cancel an in-progress summarization */
  cancelSummary(): void
  /** Reset summary state (e.g. on panel close or regenerate) */
  resetSummary(): void
  /** Called by the IPC listener hook when a pull progress chunk arrives */
  _onProgress(data: AIPullProgress): void
  /** Called by the IPC listener hook when pull finishes */
  _onDone(data: { success: boolean; error?: string }): void
  /** Called by the IPC listener hook when a summary token arrives */
  _onChunk(token: string): void
  /** Called by the IPC listener hook when summarization finishes */
  _onSummaryDone(data: { success: boolean; error?: string }): void
  /** Reset back to idle so the setup flow can be re-triggered */
  reset(): void
}

type AIStore = AIState & AIActions

export const useAIStore = create<AIStore>((set, get) => ({
  status: 'idle',
  error: null,
  pullProgress: null,
  summary: '',
  isSummarizing: false,
  summaryError: null,

  checkStatus: async () => {
    set({ status: 'checking', error: null })
    try {
      const result = await window.electronAPI.checkAIStatus()
      if (!result.installed) {
        set({ status: 'missing-ollama' })
      } else if (!result.running) {
        set({ status: 'service-down' })
      } else if (!result.modelReady) {
        set({ status: 'missing-model' })
      } else {
        set({ status: 'ready' })
      }
    } catch (err) {
      set({ status: 'error', error: String(err) })
    }
  },

  startDownload: async () => {
    if (get().status === 'downloading') return
    set({ status: 'downloading', pullProgress: null, error: null })
    await window.electronAPI.pullAIModel()
  },

  cancelDownload: () => {
    window.electronAPI.cancelAIPull()
    set({ status: 'missing-model', pullProgress: null })
  },

  startSummary: (pageText: string) => {
    set({ summary: '', isSummarizing: true, summaryError: null })
    window.electronAPI.summarizePage(pageText)
  },

  cancelSummary: () => {
    window.electronAPI.cancelSummarize()
    set({ isSummarizing: false })
  },

  resetSummary: () => {
    set({ summary: '', isSummarizing: false, summaryError: null })
  },

  _onProgress: (data) => {
    set({ pullProgress: data })
  },

  _onDone: ({ success, error }) => {
    if (success) {
      set({ status: 'ready', pullProgress: null })
    } else {
      set({ status: 'error', error: error ?? 'Unknown error during model pull', pullProgress: null })
    }
  },

  _onChunk: (token: string) => {
    set((s) => ({ summary: s.summary + token }))
  },

  _onSummaryDone: ({ success, error }) => {
    if (success) {
      set({ isSummarizing: false })
    } else {
      set({ isSummarizing: false, summaryError: error ?? 'Summarization failed' })
    }
  },

  reset: () => {
    set({ status: 'idle', error: null, pullProgress: null, summary: '', isSummarizing: false, summaryError: null })
  },
}))
