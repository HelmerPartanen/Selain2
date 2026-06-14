// ── Ollama Manager ────────────────────────────────────────────────────────────
// All Ollama interactions run here in the main process.
// The renderer communicates via IPC — never spawning processes or making
// localhost requests directly.

import { exec } from 'child_process'
import { promisify } from 'util'
import http from 'http'
import { getMainWindow } from '../state'

const execAsync = promisify(exec)

export const OLLAMA_HOST = 'localhost'
export const OLLAMA_PORT = 11434
export const TARGET_MODEL = 'gemma3:1b'

// Reference to the active pull request so we can cancel it
let activePullRequest: http.ClientRequest | null = null

// ── Helpers ───────────────────────────────────────────────────────────────────

function sendToRenderer(channel: string, payload: unknown): void {
  const win = getMainWindow()
  if (!win || win.isDestroyed()) return
  if (win.webContents.isDestroyed()) return
  win.webContents.send(channel, payload)
}

function httpGet(path: string, timeoutMs = 3000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host: OLLAMA_HOST, port: OLLAMA_PORT, path, timeout: timeoutMs },
      (res) => {
        let body = ''
        res.on('data', (chunk: Buffer) => { body += chunk.toString() })
        res.on('end', () => resolve(body))
        res.on('error', reject)
      },
    )
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns true if the `ollama` binary is available in PATH.
 * Uses `ollama --version` — safe, fast, exits immediately.
 */
export async function checkOllamaInstalled(): Promise<boolean> {
  try {
    await execAsync('ollama --version')
    return true
  } catch {
    return false
  }
}

/**
 * Returns true if the Ollama service is reachable on localhost:11434.
 * The service must be running to list or pull models.
 */
export async function checkOllamaRunning(): Promise<boolean> {
  try {
    await httpGet('/')
    return true
  } catch {
    return false
  }
}

/**
 * Returns true if `gemma3:1b` (or `gemma3:1b:latest`) is in the local model list.
 */
export async function checkModelAvailable(): Promise<boolean> {
  try {
    const body = await httpGet('/api/tags')
    const data = JSON.parse(body) as { models?: Array<{ name: string }> }
    const models = data.models ?? []
    return models.some(
      (m) => m.name === TARGET_MODEL || m.name.startsWith(`${TARGET_MODEL}:`),
    )
  } catch {
    return false
  }
}

interface PullChunk {
  status: string
  digest?: string
  total?: number
  completed?: number
  error?: string
}

/**
 * Starts streaming `ollama pull gemma3:1b` via the Ollama REST API.
 * Progress events are forwarded to the renderer via IPC.
 * Does nothing if a pull is already active (prevents duplicates).
 */
export function pullModel(): void {
  if (activePullRequest) return

  const requestBody = JSON.stringify({ name: TARGET_MODEL, stream: true })
  const options: http.RequestOptions = {
    host: OLLAMA_HOST,
    port: OLLAMA_PORT,
    path: '/api/pull',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody),
    },
  }

  activePullRequest = http.request(options, (res) => {
    let lineBuffer = ''

    res.on('data', (chunk: Buffer) => {
      lineBuffer += chunk.toString()
      // Ollama sends NDJSON — split on newlines and parse each complete line
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line) as PullChunk

          if (data.error) {
            activePullRequest = null
            sendToRenderer('ai:pull-done', { success: false, error: data.error })
            return
          }

          const progress =
            data.total && data.completed
              ? Math.round((data.completed / data.total) * 100)
              : 0

          sendToRenderer('ai:pull-progress', {
            status: data.status,
            progress,
            total: data.total ?? 0,
            completed: data.completed ?? 0,
          })
        } catch {
          // Malformed JSON chunk — skip silently
        }
      }
    })

    res.on('end', () => {
      activePullRequest = null
      sendToRenderer('ai:pull-done', { success: true })
    })

    res.on('error', (err) => {
      activePullRequest = null
      sendToRenderer('ai:pull-done', { success: false, error: err.message })
    })
  })

  activePullRequest.on('error', (err) => {
    activePullRequest = null
    sendToRenderer('ai:pull-done', { success: false, error: err.message })
  })

  activePullRequest.write(requestBody)
  activePullRequest.end()
}

/**
 * Aborts an in-progress model pull.
 */
export function cancelPull(): void {
  if (activePullRequest) {
    activePullRequest.destroy()
    activePullRequest = null
  }
}

/**
 * Returns true if a pull is currently in progress.
 */
export function isPulling(): boolean {
  return activePullRequest !== null
}

// ── Summarization ─────────────────────────────────────────────────────────────

let activeSummaryRequest: http.ClientRequest | null = null

const SYSTEM_PROMPT =
  'You are a precise web page summarizer. Respond only in Markdown, no explanation or commentary. ' +
  'Begin with a single H1 heading (# ...) containing the page title or main topic. ' +
  'Use at most 3 secondary headings (##) and bullet lists only for key features, facts, or comparisons. ' +
  'Use bold for names, products, key metrics, and important terms. ' +
  'Do not use phrases like "Here is", "Below is", "This page", "Overview", or any introductory filler. ' +
  'Do not hallucinate information not present in the provided page content. ' +
  'Focus on purpose, main claims, key features, important data points, benefits, and calls to action. ' +
  'Ignore navigation, footer, cookie banner, and unrelated UI text. ' +
  'If the provided content is too short or not informative, produce a single sentence stating that no useful summary can be generated.';

// Patterns that small models prepend despite instructions — strip them from output
const PREAMBLE_RE = /^\s*(?:here(?:'s| is) (?:a |the )?(?:markdown |formatted )?summary[^:]*[:.]\s*\n*|sure[!,.]?\s*\n*|okay[!,.]?\s*\n*|below is[^:]*[:.]\s*\n*|the following[^:]*[:.]\s*\n*)/i

/**
 * Streams a page summarization request to Ollama.
 * Token chunks are forwarded to the renderer via `ai:summary-chunk`.
 * Completion (or error) is signalled via `ai:summary-done`.
 */
export function summarizePage(pageText: string): void {
  if (activeSummaryRequest) {
    activeSummaryRequest.destroy()
    activeSummaryRequest = null
  }

  // Truncate to ~6000 chars to stay within the model context window
  const truncated =
    pageText.length > 6000
      ? pageText.slice(0, 6000) + '\n\n[Content truncated]'
      : pageText

  const requestBody = JSON.stringify({
    model: TARGET_MODEL,
    system: SYSTEM_PROMPT,
    prompt: truncated,
    stream: true,
  })

  const options: http.RequestOptions = {
    host: OLLAMA_HOST,
    port: OLLAMA_PORT,
    path: '/api/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody),
    },
  }

  // Accumulate early tokens so we can strip any preamble the model adds
  let preambleBuffer = ''
  let preambleStripped = false

  activeSummaryRequest = http.request(options, (res) => {
    let lineBuffer = ''

    res.on('data', (chunk: Buffer) => {
      lineBuffer += chunk.toString()
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line) as { response?: string; done?: boolean; error?: string }
          if (data.error) {
            activeSummaryRequest = null
            sendToRenderer('ai:summary-done', { success: false, error: data.error })
            return
          }
          if (data.response) {
            if (!preambleStripped) {
              // Buffer tokens until we have enough to detect a preamble
              preambleBuffer += data.response
              if (preambleBuffer.length >= 80 || data.done) {
                preambleStripped = true
                const cleaned = preambleBuffer.replace(PREAMBLE_RE, '')
                if (cleaned) sendToRenderer('ai:summary-chunk', cleaned)
              }
            } else {
              sendToRenderer('ai:summary-chunk', data.response)
            }
          }
          if (data.done) {
            // Flush any remaining preamble buffer
            if (!preambleStripped && preambleBuffer) {
              const cleaned = preambleBuffer.replace(PREAMBLE_RE, '')
              if (cleaned) sendToRenderer('ai:summary-chunk', cleaned)
            }
            activeSummaryRequest = null
            sendToRenderer('ai:summary-done', { success: true })
          }
        } catch {
          // skip malformed line
        }
      }
    })

    res.on('end', () => {
      activeSummaryRequest = null
      sendToRenderer('ai:summary-done', { success: true })
    })

    res.on('error', (err) => {
      activeSummaryRequest = null
      sendToRenderer('ai:summary-done', { success: false, error: err.message })
    })
  })

  activeSummaryRequest.on('error', (err) => {
    activeSummaryRequest = null
    sendToRenderer('ai:summary-done', { success: false, error: err.message })
  })

  activeSummaryRequest.write(requestBody)
  activeSummaryRequest.end()
}

/**
 * Cancels an in-progress summarization.
 */
export function cancelSummarization(): void {
  if (activeSummaryRequest) {
    activeSummaryRequest.destroy()
    activeSummaryRequest = null
  }
}
