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
export const TARGET_MODEL = 'qwen2.5:3b'

let activePullRequest: http.ClientRequest | null = null

// Per-pull layer tracking for monotonic progress
let _pullAccumulatedBytes = 0
let _pullTotalEstimate = 0
let _pullCurrentDigest = ''
let _pullCurrentLayerTotal = 0

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

export async function checkOllamaInstalled(): Promise<boolean> {
  try {
    // Add 5-second timeout to prevent app hang if ollama is unresponsive
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('ollama check timeout')), 5000)
    )
    await Promise.race([execAsync('ollama --version'), timeoutPromise])
    return true
  } catch {
    return false
  }
}

export async function checkOllamaRunning(): Promise<boolean> {
  try {
    await httpGet('/')
    return true
  } catch {
    return false
  }
}

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

export function pullModel(): void {
  if (activePullRequest) return

  // Reset layer tracking
  _pullAccumulatedBytes = 0
  _pullTotalEstimate = 0
  _pullCurrentDigest = ''
  _pullCurrentLayerTotal = 0

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

          if (data.total !== undefined && data.completed !== undefined && data.digest) {
            // New layer started?
            if (data.digest !== _pullCurrentDigest) {
              if (_pullCurrentDigest !== '') {
                _pullAccumulatedBytes += _pullCurrentLayerTotal
              }
              _pullCurrentDigest = data.digest
              _pullCurrentLayerTotal = data.total
            } else {
              _pullCurrentLayerTotal = data.total
            }
            _pullTotalEstimate = _pullAccumulatedBytes + _pullCurrentLayerTotal
            const currentCompleted = _pullAccumulatedBytes + data.completed
            const progress = _pullTotalEstimate > 0
              ? Math.min(99, Math.round((currentCompleted / _pullTotalEstimate) * 100))
              : 0
            sendToRenderer('ai:pull-progress', {
              status: data.status,
              progress,
              total: _pullTotalEstimate,
              completed: currentCompleted,
            })
          } else {
            sendToRenderer('ai:pull-progress', {
              status: data.status,
              progress: _pullTotalEstimate > 0 ? 99 : 0,
              total: _pullTotalEstimate,
              completed: _pullTotalEstimate,
            })
          }
        } catch {
          // Malformed JSON chunk — skip
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

export function cancelPull(): void {
  if (activePullRequest) {
    activePullRequest.destroy()
    activePullRequest = null
  }
}

export function isPulling(): boolean {
  return activePullRequest !== null
}

// ── Summarization ─────────────────────────────────────────────────────────────

let activeSummaryRequest: http.ClientRequest | null = null

export type SummarizeSource = 'webpage' | 'pdf'

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You write fast, clean markdown summaries from extracted webpage or PDF text.

## Concise source-specific title
One sentence stating the main point. No preamble.

## Key points
- **Key term** followed by the first concrete point.
- **Key term** followed by the second concrete point.
- **Key term** followed by the third concrete point.
- Include 3–5 bullets total, one line each, no nested lists.

## Takeaway
One sentence with the single thing the reader should remember.

Hard rules:
- Match the language of the page. Non-English page → non-English summary.
- Start with the first ## line. No "Here is the summary". No filler.
- Never wrap the title or headings in braces, brackets, or quotes.
- No emojis, no exclamation marks, no hype words ("amazing", "incredible").
- Never invent facts. If a number, date, or name is not in the source, omit it.
- Bold only the key term in a bullet, not the whole sentence.
- 90–150 words total. Stop as soon as Takeaway is written.
- If the page text is too thin to summarize, output exactly:
  ## Summary

  *Not enough readable content to summarize.*

Formatting: use exactly three ## headings: the source-specific title, Key points, and Takeaway. Do not use # or ###. Bullets are dash-space. Blockquote is >-space. Keep paragraphs single-line.`

// ── Context extraction ────────────────────────────────────────────────────────
const WEB_CONTEXT_BUDGET = 3600
const PDF_CONTEXT_BUDGET = 6500

function compactContext(raw: string): string {
  return raw
    .replace(/\r/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function fitContextBudget(text: string, budget: number): string {
  if (text.length <= budget) return text
  const headSize = Math.floor(budget * 0.75)
  const tailSize = budget - headSize - 7
  return `${text.slice(0, headSize).trim()}\n\n[...]\n\n${text.slice(-tailSize).trim()}`
}

function prepareSummaryContext(raw: string, source: SummarizeSource): string {
  const compact = compactContext(raw)
  return fitContextBudget(compact, source === 'pdf' ? PDF_CONTEXT_BUDGET : WEB_CONTEXT_BUDGET)
}

// Strip preamble phrases that small models emit despite instructions.
// We buffer the first PREAMBLE_BUFFER_SIZE chars before sending so we can clean
// the very first token(s) — beyond that we stream immediately for low latency.
const PREAMBLE_RE =
  /^\s*(?:(?:here(?:'s| is)|below is|the following)(?:\s+(?:a|the|my|your|an?)\s+)?(?:(?:markdown\s+)?summary|overview|breakdown|recap)[^:\n]*[:.]\s*\n*|(?:sure|okay|of course|absolutely|certainly|got it)[!,.]?\s*\n*|here you go[:,]?\s*\n*)/i

// ── Public summarize function ─────────────────────────────────────────────────

export function summarizePage(pageText: string, source: SummarizeSource = 'webpage'): void {
  // Cancel any in-flight request before starting a new one
  if (activeSummaryRequest) {
    activeSummaryRequest.destroy()
    activeSummaryRequest = null
  }

  const context = prepareSummaryContext(pageText, source)

  // If the page yielded nothing useful, short-circuit immediately
  if (!context.trim()) {
    const emptyMessage = source === 'pdf'
      ? '*No readable text found in this PDF.*'
      : '*No readable content found on this page.*'
    sendToRenderer('ai:summary-chunk', emptyMessage)
    sendToRenderer('ai:summary-done', { success: true })
    return
  }

  const promptLead = source === 'pdf'
    ? 'Summarize this extracted PDF text:'
    : 'Summarize this extracted webpage text:'

  const requestBody = JSON.stringify({
    model: TARGET_MODEL,
    system: SYSTEM_PROMPT,
    prompt: `${promptLead}\n\n${context}`,
    stream: true,
    // Keep generation short: summarization speed is mostly input tokens + output tokens.
    options: {
      temperature: 0.1,
      top_p: 0.9,
      num_ctx: source === 'pdf' ? 4096 : 2048,
      num_predict: 280,
      repeat_penalty: 1.1,
    },
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

  // Preamble stripping: buffer the first PREAMBLE_BUFFER_SIZE chars, then stream freely.
  // 96 chars gives the model room to settle into a `##` heading even if it
  // tries a short preamble first; the regex strips it before forwarding.
  const PREAMBLE_BUFFER_SIZE = 96
  let preambleBuffer = ''
  let preambleStripped = false
  // Track whether we've sent at least one chunk — for the end-flush guard
  let sentAnyChunk = false

  function flushPreambleBuffer(): void {
    preambleStripped = true
    const cleaned = preambleBuffer.replace(PREAMBLE_RE, '')
    if (cleaned) {
      sendToRenderer('ai:summary-chunk', cleaned)
      sentAnyChunk = true
    }
  }

  activeSummaryRequest = http.request(options, (res) => {
    let lineBuffer = ''

    res.on('data', (chunk: Buffer) => {
      lineBuffer += chunk.toString()
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line) as {
            response?: string
            done?: boolean
            error?: string
          }

          if (data.error) {
            activeSummaryRequest = null
            sendToRenderer('ai:summary-done', { success: false, error: data.error })
            return
          }

          if (data.response) {
            if (!preambleStripped) {
              preambleBuffer += data.response
              if (preambleBuffer.length >= PREAMBLE_BUFFER_SIZE) {
                flushPreambleBuffer()
              }
            } else {
              sendToRenderer('ai:summary-chunk', data.response)
              sentAnyChunk = true
            }
          }

          if (data.done) {
            // Flush remaining preamble buffer if we haven't yet
            if (!preambleStripped) {
              flushPreambleBuffer()
            }
            // If the model emitted nothing at all, surface a clear message
            if (!sentAnyChunk) {
              sendToRenderer('ai:summary-chunk', '*The model returned an empty response. Try regenerating.*')
            }
            activeSummaryRequest = null
            sendToRenderer('ai:summary-done', { success: true })
          }
        } catch {
          // Skip malformed NDJSON lines — common with partial flushes
        }
      }
    })

    res.on('end', () => {
      // Guard: `done: true` in the NDJSON should have already fired summary-done,
      // but if the connection closes without a done frame, clean up here.
      if (activeSummaryRequest !== null) {
        if (!preambleStripped) flushPreambleBuffer()
        activeSummaryRequest = null
        sendToRenderer('ai:summary-done', { success: true })
      }
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

export function cancelSummarization(): void {
  if (activeSummaryRequest) {
    activeSummaryRequest.destroy()
    activeSummaryRequest = null
  }
}
