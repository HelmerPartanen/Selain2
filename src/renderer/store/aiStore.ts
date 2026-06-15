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
import { logger } from '@/utils/logger'

const AI_TIMEOUT_MS = 5000

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
  summaryBuffer: string
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

let _pullTimeoutId: ReturnType<typeof setTimeout> | null = null

export const useAIStore = create<AIStore>((set, get) => ({
  status: 'idle',
  error: null,
  pullProgress: null,
  summary: '',
  summaryBuffer: '',
  isSummarizing: false,
  summaryError: null,

  checkStatus: async () => {
    set({ status: 'checking', error: null })
    try {
      // Apply timeout to prevent indefinite hanging
      const result = await Promise.race([
        window.electronAPI.checkAIStatus(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI status check timeout')), AI_TIMEOUT_MS)
        )
      ])

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
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      logger.error('[AI] Status check failed:', errorMsg)
      set({ status: 'error', error: errorMsg })
    }
  },

  startDownload: async () => {
    if (get().status === 'downloading') return
    set({ status: 'downloading', pullProgress: null, error: null })
    window.electronAPI.pullAIModel()
    // Real timeout: if still downloading after 30 min, cancel and surface error
    if (_pullTimeoutId) clearTimeout(_pullTimeoutId)
    _pullTimeoutId = setTimeout(() => {
      _pullTimeoutId = null
      if (get().status === 'downloading') {
        window.electronAPI.cancelAIPull()
        set({ status: 'error', error: 'Model download timed out after 30 minutes.', pullProgress: null })
      }
    }, 30 * 60 * 1000)
  },

  cancelDownload: () => {
    if (_pullTimeoutId) { clearTimeout(_pullTimeoutId); _pullTimeoutId = null }
    window.electronAPI.cancelAIPull()
    set({ status: 'missing-model', pullProgress: null })
  },

  startSummary: (pageText: string) => {
    window.electronAPI.cancelSummarize()
    set({ summary: '', summaryBuffer: '', isSummarizing: true, summaryError: null })
    window.electronAPI.summarizePage(pageText)
  },

  cancelSummary: () => {
    window.electronAPI.cancelSummarize()
    set({ isSummarizing: false })
  },

  resetSummary: () => {
    set({ summary: '', summaryBuffer: '', isSummarizing: false, summaryError: null })
  },

  _onProgress: (data) => {
    set({ pullProgress: data })
  },

  _onDone: ({ success, error }) => {
    if (_pullTimeoutId) { clearTimeout(_pullTimeoutId); _pullTimeoutId = null }
    if (success) {
      set({ status: 'ready', pullProgress: null })
    } else {
      set({ status: 'error', error: error ?? 'Unknown error during model pull', pullProgress: null })
    }
  },

  _onChunk: (token: string) => {
    set((s) => ({ summaryBuffer: s.summaryBuffer + token }))
  },

  _onSummaryDone: ({ success, error }) => {
    if (success) {
      set((s) => ({ summary: s.summaryBuffer, summaryBuffer: '', isSummarizing: false }))
    } else {
      set({ summaryBuffer: '', isSummarizing: false, summaryError: error ?? 'Summarization failed' })
    }
  },

  reset: () => {
    set({ status: 'idle', error: null, pullProgress: null, summary: '', summaryBuffer: '', isSummarizing: false, summaryError: null })
  },
}))
