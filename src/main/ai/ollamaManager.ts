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
export const TARGET_MODEL = 'qwen2.5:0.5b'

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

// ── System prompt ─────────────────────────────────────────────────────────────
// Designed for Qwen2.5 0.5B — keep the prompt concise and factual for reliable summaries.
// Prioritizes preservation of most valuable information by content type.
const SYSTEM_PROMPT = `You are a browser assistant that summarizes web pages intelligently, preserving the most valuable information.

Your output must be short, specific, and immediately useful to someone who hasn't read the page.

**Content-Type Priority Rules:**

For RECIPES or COOKING:
- Lead with the dish name and key distinguishing feature (e.g., "**Fudgy Brownies** - uses 2 eggs + water for moist texture")
- Include 2-3 critical ingredients or techniques if listed (e.g., "Uses powdered sugar for thickening")
- Mention yield/servings, prep time, or special notes if present
- Include ingredient counts if visible (e.g., "7 pantry ingredients")
- Never omit the recipe itself — if it exists on the page, capture the essential elements

For HOW-TOs, TUTORIALS, or GUIDES:
- Start with what skill/task is covered
- List 3-5 key steps or sections as bullet points
- Highlight any tools, requirements, or prerequisites
- Include time estimate if available

For NEWS, ARTICLES, or ESSAYS:
- Lead with the main event, person, or claim
- Include concrete details: names, dates, places, numbers
- Mention who/what is involved
- Include the core conclusion or takeaway

For BIOGRAPHIES or ENCYCLOPEDIAS:
- Mention the person's full name, birth/death dates, nationality, profession
- Highlight their major role, achievement, or historical significance

**Universal Rules:**
- Detect the language of the page text and summarize in that same language
- Use 2–5 short sentences OR bullet points if the content naturally lists separate items
- Never repeat page title verbatim — start directly with substance
- Preserve URLs or references mentioned on the page (e.g., "Check https://example.com for the original")
- Avoid vague language, filler, and invented facts
- If content is thin, say so honestly in one sentence
- Plain markdown only. Use **bold** for key terms. Use bullets (-) for genuinely list-like content.
`

// ── Context extraction ────────────────────────────────────────────────────────
// A naive .slice(0, 6000) front-loads boilerplate (nav, cookie banners, hero
// marketing copy) and cuts off the actual content. This extractor prioritises:
//   1. Title + meta description (highest signal, zero tokens wasted)
//   2. Body text with nav/footer/cookie noise stripped
//   3. The opening ~2 000 chars (lede) + the closing ~1 000 chars (CTA/conclusion)
//      with a middle sample — better coverage than a flat prefix.

const NOISE_RE =
  /^(accept( all)? cookies?|cookie (policy|settings|preferences)|privacy policy|terms( of( service|use))?|copyright ©|all rights reserved|skip to (main )?content|back to top|\d+ min(ute)? read|share (this|on)|follow us|subscribe( to our newsletter)?|sign (in|up)|log (in|out)|menu|navigation|search\.{0,3})/i

function isStructuredLine(line: string): boolean {
  return /[\t:|]/.test(line)
}

function normalizeLine(line: string): string {
  return line.replace(/^[#>*+\-\s]+/, '').trim()
}

function extractPageContext(raw: string): string {
  const lines = raw
    .split(/\n+/)
    .map((l) => normalizeLine(l.trim()))
    .filter((l) => (l.length > 25 || isStructuredLine(l)) && !NOISE_RE.test(l))

  // Deduplicate repeated lines (nav items often repeat verbatim)
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const line of lines) {
    const key = line.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(line)
    }
  }

  const joined = deduped.join('\n')

  // Budget: ~4 500 chars → fits comfortably within the model context window used for summaries.
  const BUDGET = 4500
  if (joined.length <= BUDGET) return joined

  // Take the opening lede (first 60% of budget) + conclusion (last 25%)
  // This captures both the main claim and the call-to-action/conclusion.
  const ledeEnd = Math.floor(BUDGET * 0.6)
  const tailStart = joined.length - Math.floor(BUDGET * 0.25)
  const lede = joined.slice(0, ledeEnd)
  const tail = joined.slice(tailStart)

  return `${lede}\n\n[…]\n\n${tail}`
}

// Strip preamble phrases that small models emit despite instructions.
// We buffer the first 120 chars before sending so we can clean the very
// first token(s) — beyond that we stream immediately for low latency.
const PREAMBLE_RE =
  /^\s*(?:(?:here(?:'s| is)|below is|the following)(?:\s+(?:a|the|my|your|an?)\s+)?(?:(?:markdown\s+)?summary|overview|breakdown)[^:\n]*[:.]\s*\n*|(?:sure|okay|of course|absolutely)[!,.]?\s*\n*)/i

// ── Public summarize function ─────────────────────────────────────────────────

export function summarizePage(pageText: string): void {
  // Cancel any in-flight request before starting a new one
  if (activeSummaryRequest) {
    activeSummaryRequest.destroy()
    activeSummaryRequest = null
  }

  const context = extractPageContext(pageText)

  // If the page yielded nothing useful, short-circuit immediately
  if (!context.trim()) {
    sendToRenderer('ai:summary-chunk', '*No readable content found on this page.*')
    sendToRenderer('ai:summary-done', { success: true })
    return
  }

  const requestBody = JSON.stringify({
    model: TARGET_MODEL,
    system: SYSTEM_PROMPT,
    prompt: `Read the following page text and summarize it clearly and accurately:\n\n${context}`,
    stream: true,
    // Tighten generation: we want concise, factual output — not creative rambling.
    // num_predict caps tokens; temperature 0.2 reduces hallucination on 1B models.
    options: {
      temperature: 0.2,
      num_predict: 300,
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

  // Preamble stripping: buffer the first PREAMBLE_BUFFER_SIZE chars, then stream freely
  const PREAMBLE_BUFFER_SIZE = 120
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