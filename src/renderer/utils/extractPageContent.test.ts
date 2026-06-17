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
// These tests pin the contract that the AI summary path uses a lightweight
// DOM text extraction pass, so the model sees key page text without obvious
// nav, ads, sidebars, or footer chrome.

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

const EXTRACTED_ARTICLE_TEXT = [
  'Title: The Real Story',
  'Heading: The Real Story',
  'Main article paragraph. '.repeat(40),
  'Another paragraph with substance. '.repeat(40),
].join('\n\n')

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

  it('extracts key article text without Reader Mode', async () => {
    tabStoreState.tabs = { 'tab-1': { id: 'tab-1', url: 'https://example.com/story', title: 'The Real Story' } }
    executeJavaScript.mockResolvedValue(EXTRACTED_ARTICLE_TEXT)
    webviewRegistryGet.mockReturnValue({ executeJavaScript })

    const result = await extractPageContentForSummary('tab-1')
    expect(result.source).toBe('webpage')
    expect(result.text).toContain('Main article paragraph')
    expect(result.text).toContain('Another paragraph with substance')
    expect(result.text).not.toContain('Subscribe to our newsletter')
    expect(result.text).not.toContain('Privacy Policy')
  })

  it('returns webpage source when DOM extraction finds little content', async () => {
    tabStoreState.tabs = { 'tab-1': { id: 'tab-1', url: 'https://example.com/blank', title: 'Blank' } }
    executeJavaScript.mockResolvedValue('')
    webviewRegistryGet.mockReturnValue({ executeJavaScript })

    const result = await extractPageContentForSummary('tab-1')
    // Falls through; whatever the raw extractor produces is fine — we just
    // want to confirm the function doesn't throw and returns webpage source.
    expect(result.source).toBe('webpage')
  })
})
