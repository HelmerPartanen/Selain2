import { Readability } from '@mozilla/readability'
import { useTabStore } from '@/store/tabStore'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { isSpecialPage } from '@/utils/urlUtils'
import { isLikelyPdfUrl } from '@/utils/extractPageContent'

export interface ReaderArticle {
  title: string
  /** Sanitized article HTML (used for rendering in reader mode). */
  content: string
  /** Plain-text version of the article — same node tree, all tags stripped. */
  text: string
  byline: string | null
  siteName: string | null
  excerpt: string | null
  length: number
  url: string
}

const EXTRACT_HTML_SCRIPT = `
(function() {
  return '<!DOCTYPE html><html>' + document.documentElement.innerHTML + '</html>';
})()
`

/**
 * Extract the main article from a tab using Mozilla Readability.
 */
export async function extractReaderContent(tabId: string): Promise<ReaderArticle | null> {
  const tab = useTabStore.getState().tabs[tabId]
  const url = tab?.url ?? ''

  if (!url || url === 'about:blank' || isSpecialPage(url) || isLikelyPdfUrl(url)) {
    return null
  }

  const webview = webviewRegistry.get(tabId)
  if (!webview) return null

  try {
    const html = await webview.executeJavaScript(EXTRACT_HTML_SCRIPT)
    if (typeof html !== 'string' || !html.trim()) return null

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const base = doc.createElement('base')
    base.href = url
    doc.head.prepend(base)

    const article = new Readability(doc).parse()
    if (!article?.content?.trim()) return null

    // Readability also produces a pre-stripped textContent we can hand to the
    // AI without re-walking the HTML. Collapse runs of whitespace so the prompt
    // doesn't get bloated by indentation/newlines from the parsed DOM.
    const text = (article.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      title: article.title?.trim() || tab?.title || 'Article',
      content: article.content,
      text,
      byline: article.byline ?? null,
      siteName: article.siteName ?? null,
      excerpt: article.excerpt ?? null,
      length: article.length,
      url,
    }
  } catch {
    return null
  }
}
