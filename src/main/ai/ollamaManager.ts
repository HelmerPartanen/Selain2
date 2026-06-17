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
export const TARGET_MODEL = 'phi3:mini'

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
const SYSTEM_PROMPT = `Designed for small local models. The output contract is intentionally strict so the renderer always gets a well-structured document.

You write tight, well-structured page summaries in markdown.

Output contract — always use this structure, replacing the example text with source-specific content:

## Concise source-specific title
One or two sentences that state what this is and why it matters. No preamble.

## Key points
- **Key term** followed by the first concrete point.
- **Key term** followed by the second concrete point.
- **Key term** followed by the third concrete point.
- Include 4–6 bullets total, one line each, no nested lists.

## Takeaway
One sentence with the single thing the reader should remember.

If the page contains a notable verbatim quote, place it directly after the overview as a blockquote:
> "{exact quote}"

If the page lists references or links, end with a horizontal rule and a "Source:" line:
---
Source: {url}

Hard rules:
- Match the language of the page. Non-English page → non-English summary.
- No "Here is the summary". No "Sure!". No filler. Start with the first ## line.
- No emojis, no exclamation marks, no hype words ("amazing", "incredible").
- Never invent facts. If a number, date, or name is not in the source, omit it.
- Bold only the key term in a bullet, not the whole sentence.
- 150–220 words total. Stop as soon as Takeaway is written — do not append extras.
- If the page text is too thin to summarize, output exactly:
  ## Summary

  *Not enough readable content to summarize.*

Content-type notes (use only what fits):
- News / articles: lead with the main event, person, or claim in the overview; bullets hold concrete details (who, what, when, where, numbers).
- How-to / tutorial: overview states the goal; bullets are the steps or sections in order.
- Recipe: overview names the dish and yield; bullets are ingredients or techniques, not full instructions.
- Bio / encyclopedia: overview = identity (name, dates, role); bullets = achievements or context.
- Report / paper / PDF: overview = document type and subject; bullets = key findings, methodology, conclusions.
- Opinion / essay: overview states the thesis; bullets = the supporting arguments in order.

Formatting: use exactly three ## headings: the source-specific title, Key points, and Takeaway. Do not use # or ###. Bullets are dash-space. Blockquote is >-space. Keep paragraphs single-line.`

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

  const context = extractPageContext(pageText)

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
    ? 'Read the following PDF document text and summarize it clearly and accurately:'
    : 'Read the following page text and summarize it clearly and accurately:'

  const requestBody = JSON.stringify({
    model: TARGET_MODEL,
    system: SYSTEM_PROMPT,
    prompt: `${promptLead}\n\n${context}`,
    stream: true,
    // Generation tuning for the structured output contract:
    //   - temperature 0.2: low enough that the 3B model follows the skeleton
    //     (headings + bullets + takeaway) instead of drifting into prose.
    //   - num_predict 500: the skeleton is ~150–220 words ≈ 220–300 tokens,
    //     plus margin so a bullet or the takeaway never gets cut mid-sentence.
    //   - repeat_penalty 1.15: discourages the model from looping on the
    //     bullet marker `- ` when emitting the key-points list.
    options: {
      temperature: 0.2,
      num_predict: 500,
      repeat_penalty: 1.15,
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
  // 200 chars gives the model room to settle into a `##` heading even if it
  // tries a short preamble first; the regex strips it before forwarding.
  const PREAMBLE_BUFFER_SIZE = 200
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
