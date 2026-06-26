// ── AI IPC Handlers ───────────────────────────────────────────────────────────
// Exposes Ollama checking and model pulling to the renderer via IPC.
// The renderer must NEVER call Ollama or spawn processes directly.

import { ipcMain } from 'electron'
import {
  checkOllamaInstalled,
  checkOllamaRunning,
  checkModelAvailable,
  pullModel,
  cancelPull,
  isPulling,
  summarizePage,
  cancelSummarization,
  type SummarizeSource,
} from './ollamaManager'

export function setupAIIPC(): void {
  // ── Status check ──────────────────────────────────────────────────────────
  // Returns the full AI readiness picture in a single round-trip
  ipcMain.handle('ai:check-status', async () => {
    // First check if the service is already running (HTTP probe — most reliable).
    // This correctly handles Ollama installations that are not on PATH.
    const running = await checkOllamaRunning()
    if (running) {
      const modelReady = await checkModelAvailable()
      return { installed: true, running: true, modelReady }
    }

    // Service not reachable — check if binary is installed at all
    const installed = await checkOllamaInstalled()
    return { installed, running: false, modelReady: false }
  })

  // ── Model pull ────────────────────────────────────────────────────────────
  // Starts the pull in the background; progress arrives via pushed events
  ipcMain.handle('ai:pull-model', () => {
    if (isPulling()) return { started: false, reason: 'already-pulling' }
    pullModel()
    return { started: true }
  })

  // ── Cancel pull ───────────────────────────────────────────────────────────
  ipcMain.on('ai:cancel-pull', () => {
    cancelPull()
  })

  // ── Extract PDF text ──────────────────────────────────────────────────────
  ipcMain.handle('ai:extract-pdf-text', async (_event, url: string) => {
    if (typeof url !== 'string' || !url.trim()) return ''
    try {
      const { extractPdfText } = await import('./pdfTextExtractor')
      return await extractPdfText(url)
    } catch {
      return ''
    }
  })

  // ── Summarize page content ────────────────────────────────────────────────
  // Renderer sends extracted page text; we stream tokens back via push events
  ipcMain.on('ai:summarize', (_event, payload: { text: string; source?: SummarizeSource } | string) => {
    if (typeof payload === 'string') {
      summarizePage(payload)
      return
    }
    if (!payload || typeof payload.text !== 'string') return
    summarizePage(payload.text, payload.source ?? 'webpage')
  })

  ipcMain.on('ai:cancel-summarize', () => {
    cancelSummarization()
  })
}
