// ── AI IPC Handlers ───────────────────────────────────────────────────────────
// Exposes Ollama checking and model pulling to the renderer via IPC.
// The renderer must NEVER call Ollama or spawn processes directly.

import { ipcMain } from 'electron'
import { isTrustedAppSender } from '../state'
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

const MAX_SUMMARY_INPUT_CHARS = 250_000

function isFromAppShell(
  event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent,
): boolean {
  return isTrustedAppSender(event.sender)
}

function isAllowedPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (
      parsed.protocol !== 'file:' &&
      parsed.protocol !== 'http:' &&
      parsed.protocol !== 'https:'
    ) {
      return false
    }
    return parsed.pathname.toLowerCase().endsWith('.pdf')
  } catch {
    return false
  }
}

export function setupAIIPC(): void {
  // ── Status check ──────────────────────────────────────────────────────────
  // Returns the full AI readiness picture in a single round-trip
  ipcMain.handle('ai:check-status', async (event) => {
    if (!isFromAppShell(event)) {
      return { installed: false, running: false, modelReady: false }
    }
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
  ipcMain.handle('ai:pull-model', (event) => {
    if (!isFromAppShell(event))
      return { started: false, reason: 'untrusted-sender' }
    if (isPulling()) return { started: false, reason: 'already-pulling' }
    pullModel()
    return { started: true }
  })

  // ── Cancel pull ───────────────────────────────────────────────────────────
  ipcMain.on('ai:cancel-pull', (event) => {
    if (!isFromAppShell(event)) return
    cancelPull()
  })

  // ── Extract PDF text ──────────────────────────────────────────────────────
  ipcMain.handle('ai:extract-pdf-text', async (event, url: string) => {
    if (!isFromAppShell(event)) return ''
    if (typeof url !== 'string' || !url.trim()) return ''
    if (!isAllowedPdfUrl(url)) return ''
    try {
      const { extractPdfText } = await import('./pdfTextExtractor')
      return await extractPdfText(url)
    } catch {
      return ''
    }
  })

  // ── Summarize page content ────────────────────────────────────────────────
  // Renderer sends extracted page text; we stream tokens back via push events
  ipcMain.on(
    'ai:summarize',
    (event, payload: { text: string; source?: SummarizeSource } | string) => {
      if (!isFromAppShell(event)) return
      if (typeof payload === 'string') {
        if (payload.length > MAX_SUMMARY_INPUT_CHARS) return
        summarizePage(payload)
        return
      }
      if (!payload || typeof payload.text !== 'string') return
      if (payload.text.length > MAX_SUMMARY_INPUT_CHARS) return
      summarizePage(payload.text, payload.source ?? 'webpage')
    },
  )

  ipcMain.on('ai:cancel-summarize', (event) => {
    if (!isFromAppShell(event)) return
    cancelSummarization()
  })
}
