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
} from './ollamaManager'

export function setupAIIPC(): void {
  // ── Status check ──────────────────────────────────────────────────────────
  // Returns the full AI readiness picture in a single round-trip
  ipcMain.handle('ai:check-status', async () => {
    const installed = await checkOllamaInstalled()
    if (!installed) {
      return { installed: false, running: false, modelReady: false }
    }

    const running = await checkOllamaRunning()
    if (!running) {
      // Binary exists but the service is not started — treat same as missing
      // (user may need to run `ollama serve` or restart)
      return { installed: true, running: false, modelReady: false }
    }

    const modelReady = await checkModelAvailable()
    return { installed: true, running: true, modelReady }
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

  // ── Summarize page content ────────────────────────────────────────────────
  // Renderer sends extracted page text; we stream tokens back via push events
  ipcMain.on('ai:summarize', (_event, pageText: string) => {
    if (typeof pageText !== 'string') return
    summarizePage(pageText)
  })

  ipcMain.on('ai:cancel-summarize', () => {
    cancelSummarization()
  })
}
