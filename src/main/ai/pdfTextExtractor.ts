// ── PDF text extraction for AI summarization ─────────────────────────────────
// Loads PDF bytes from file:// or http(s):// URLs (with webview session cookies)
// and extracts plain text via pdfjs-dist.

import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { session } from 'electron'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { logger } from '../logger'

const MAX_PDF_BYTES = 25 * 1024 * 1024
const MAX_PAGES = 50
const WEBVIEW_PARTITION = 'persist:default'

function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= 4 && buf.subarray(0, 4).toString('ascii') === '%PDF'
}

async function loadPdfBytes(url: string): Promise<Buffer | null> {
  try {
    const parsed = new URL(url)

    if (parsed.protocol === 'file:') {
      if (!parsed.pathname.toLowerCase().endsWith('.pdf')) return null
      const filePath = fileURLToPath(parsed.href)
      const data = await readFile(filePath)
      if (data.length > MAX_PDF_BYTES) return null
      return data
    }

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const ses = session.fromPartition(WEBVIEW_PARTITION)
      const response = await ses.fetch(url, { redirect: 'follow' })
      if (!response.ok) return null

      const contentType = response.headers.get('content-type') ?? ''
      const arrayBuffer = await response.arrayBuffer()
      if (arrayBuffer.byteLength > MAX_PDF_BYTES) return null

      const buffer = Buffer.from(arrayBuffer)
      if (!contentType.includes('application/pdf') && !isPdfBuffer(buffer))
        return null
      return buffer
    }
  } catch (err) {
    logger.warn('[PDF] Failed to load PDF bytes:', err)
  }
  return null
}

export async function extractPdfText(url: string): Promise<string> {
  const buffer = await loadPdfBytes(url)
  if (!buffer || !isPdfBuffer(buffer)) return ''

  const data = new Uint8Array(buffer)
  const loadingTask = getDocument({ data })
  const doc = await loadingTask.promise

  const parts: string[] = []
  const pageCount = Math.min(doc.numPages, MAX_PAGES)

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim()
    if (pageText) parts.push(pageText)
  }

  await loadingTask.destroy()
  return parts.join('\n\n')
}
