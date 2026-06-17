import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isLikelyPdfUrl, extractPageContentForSummary } from './extractPageContent'

describe('isLikelyPdfUrl', () => {
  it('detects http PDF URLs', () => {
    expect(isLikelyPdfUrl('https://example.com/report.pdf')).toBe(true)
    expect(isLikelyPdfUrl('https://example.com/report.PDF')).toBe(true)
    expect(isLikelyPdfUrl('https://example.com/files/doc.pdf?token=abc')).toBe(true)
  })

  it('detects file PDF URLs', () => {
    expect(isLikelyPdfUrl('file:///C:/Users/test/document.pdf')).toBe(true)
  })

  it('returns false for normal web pages', () => {
    expect(isLikelyPdfUrl('https://example.com/article')).toBe(false)
    expect(isLikelyPdfUrl('https://example.com/page.html')).toBe(false)
  })

  it('returns false for invalid URLs', () => {
    expect(isLikelyPdfUrl('not-a-url')).toBe(false)
  })
})

// ── extractPageContentForSummary ───────────────────────────────────────────────
// These tests pin the contract that the AI summary path uses Reader Mode first,
// so the model only ever sees the article body — not nav, ads, or footers.

const tabStoreState = {
  tabs: {} as Record<string, { id: string; url: string; title: string }>,
}
vi.mock('@/store/tabStore', () => ({
  useTabStore: { getState: () => tabStoreState },
}))

const executeJavaScript = vi.fn()
const webviewRegistryGet = vi.fn()
vi.mock('@/webview/webviewRegistry', () => ({
  webviewRegistry: { get: (id: string) => webviewRegistryGet(id) },
}))

// window.electronAPI.extractPdfText isn't touched in the webpage path; stub it
// so the module loads cleanly.
;(globalThis as { window?: { electronAPI?: unknown } }).window = {
  electronAPI: { extractPdfText: vi.fn().mockResolvedValue('') },
}

const ARTICLE_HTML = `
<!DOCTYPE html>
<html>
  <head><title>The Real Story</title></head>
  <body>
    <nav><a href="/">Home</a></nav>
    <article>
      <h1>The Real Story</h1>
      <p>${'Main article paragraph. '.repeat(40)}</p>
      <p>${'Another paragraph with substance. '.repeat(40)}</p>
    </article>
    <footer>Subscribe to our newsletter! Privacy Policy. Terms of Service.</footer>
  </body>
</html>
`

beforeEach(() => {
  tabStoreState.tabs = {}
  executeJavaScript.mockReset()
  webviewRegistryGet.mockReset()
})

describe('extractPageContentForSummary', () => {
  it('returns empty text for special pages', async () => {
    tabStoreState.tabs = { 'tab-1': { id: 'tab-1', url: 'browser://newtab', title: 'New Tab' } }
    const result = await extractPageContentForSummary('tab-1')
    expect(result.text).toBe('')
    expect(result.source).toBe('webpage')
  })

  it('prefers Reader Mode text over raw body text for articles', async () => {
    tabStoreState.tabs = { 'tab-1': { id: 'tab-1', url: 'https://example.com/story', title: 'The Real Story' } }
    executeJavaScript.mockResolvedValue(ARTICLE_HTML)
    webviewRegistryGet.mockReturnValue({ executeJavaScript })

    const result = await extractPageContentForSummary('tab-1')
    expect(result.source).toBe('webpage')
    // Reader Mode output — article body, no nav/footer noise.
    expect(result.text).toContain('Main article paragraph')
    expect(result.text).not.toContain('Subscribe to our newsletter')
    expect(result.text).not.toContain('Privacy Policy')
  })

  it('falls back to raw body text when Reader Mode finds nothing', async () => {
    tabStoreState.tabs = { 'tab-1': { id: 'tab-1', url: 'https://example.com/blank', title: 'Blank' } }
    // Return HTML with no readable article — Readability returns null.
    executeJavaScript.mockResolvedValue('<!DOCTYPE html><html><body></body></html>')
    webviewRegistryGet.mockReturnValue({ executeJavaScript })

    const result = await extractPageContentForSummary('tab-1')
    // Falls through; whatever the raw extractor produces is fine — we just
    // want to confirm the function doesn't throw and returns webpage source.
    expect(result.source).toBe('webpage')
  })
})
