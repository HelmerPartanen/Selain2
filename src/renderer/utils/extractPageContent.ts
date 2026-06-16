import { useTabStore } from '@/store/tabStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { isSpecialPage } from '@/utils/urlUtils'

export type PageContentSource = 'webpage' | 'pdf'

export interface PageContentForSummary {
  text: string
  source: PageContentSource
}

/** Returns true when the URL likely points at a PDF document. */
export function isLikelyPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'file:') {
      return parsed.pathname.toLowerCase().endsWith('.pdf')
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase()
      return /\.pdf(?:$|[?#])/i.test(pathAndQuery) || pathAndQuery.endsWith('.pdf')
    }
    return false
  } catch {
    return false
  }
}

function shouldTryPdfExtraction(url: string, webText: string, title: string): boolean {
  if (isLikelyPdfUrl(url)) return true
  const trimmed = webText.trim()
  if (trimmed.length >= 120) return false
  if (/\.pdf/i.test(url) || /\.pdf/i.test(title)) return true
  if (/^page\s+\d+/i.test(trimmed)) return true
  if (trimmed.length < 30) return true
  return false
}

const EXTRACT_WEBPAGE_TEXT_SCRIPT = `
(function() {
  const parts = [];
  const title = document.title && document.title.trim();
  if (title && title !== 'about:blank') parts.push('Title: ' + title);
  const metaDesc = document.querySelector('meta[name="description"]');
  const desc = metaDesc && metaDesc.getAttribute('content');
  if (desc && desc.trim()) parts.push('Description: ' + desc.trim());
  const h1 = document.querySelector('h1');
  if (h1 && h1.innerText && h1.innerText.trim()) parts.push('Heading: ' + h1.innerText.trim());
  const body = document.body && document.body.innerText;
  if (body && body.trim()) parts.push(body.trim());
  return parts.join('\\n\\n');
})()
`

async function tryExtractPdfText(url: string): Promise<string | null> {
  try {
    const text = await window.electronAPI.extractPdfText(url)
    return text.trim() ? text : null
  } catch {
    return null
  }
}

/**
 * Extract readable text from the active tab for AI summarization.
 * Uses PDF parsing for documents and DOM text for normal web pages.
 */
export async function extractPageContentForSummary(tabId: string): Promise<PageContentForSummary> {
  const tab = useTabStore.getState().tabs[tabId]
  const url = tab?.url ?? ''
  const title = tab?.title ?? ''

  if (!url || url === 'about:blank' || isSpecialPage(url)) {
    return { text: '', source: 'webpage' }
  }

  if (isLikelyPdfUrl(url)) {
    const pdfText = await tryExtractPdfText(url)
    if (pdfText) return { text: pdfText, source: 'pdf' }
  }

  const webview = webviewRegistry.get(tabId)
  let webText = ''

  if (webview) {
    try {
      const result = await webview.executeJavaScript(EXTRACT_WEBPAGE_TEXT_SCRIPT)
      if (typeof result === 'string') webText = result
    } catch {
      // DOM extraction failed — may still recover via PDF path below
    }
  }

  if (webText.trim() && !shouldTryPdfExtraction(url, webText, title)) {
    return { text: webText, source: 'webpage' }
  }

  const pdfText = await tryExtractPdfText(url)
  if (pdfText) return { text: pdfText, source: 'pdf' }

  if (webText.trim()) {
    return { text: webText, source: 'webpage' }
  }

  return { text: '', source: 'webpage' }
}
