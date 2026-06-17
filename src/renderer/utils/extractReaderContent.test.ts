import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing the module under test.
const tabStoreState = { tabs: {} as Record<string, { id: string; url: string; title: string }> }
vi.mock('@/store/tabStore', () => ({
  useTabStore: {
    getState: () => tabStoreState,
  },
}))

const executeJavaScript = vi.fn()
const webviewRegistryGet = vi.fn()
vi.mock('@/webview/webviewRegistry', () => ({
  webviewRegistry: {
    get: (id: string) => webviewRegistryGet(id),
  },
}))

import { extractReaderContent } from './extractReaderContent'

const ARTICLE_HTML = `
<!DOCTYPE html>
<html>
  <head><title>Test Page</title></head>
  <body>
    <header><nav><a href="/">Home</a><a href="/about">About</a></nav></header>
    <main>
      <article>
        <h1>The Real Story</h1>
        <p>${'This is the actual article body that the reader should extract. '.repeat(20)}</p>
        <p>${'A second paragraph with more substantial content for Readability to pick up. '.repeat(20)}</p>
      </article>
    </main>
    <footer>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
      <p>Subscribe to our newsletter for more content like this!</p>
    </footer>
  </body>
</html>
`

function setupWebviewMock(html: string, tabId = 'tab-1', url = 'https://example.com/story') {
  tabStoreState.tabs = { [tabId]: { id: tabId, url, title: 'Test Page' } }
  executeJavaScript.mockResolvedValue(html)
  webviewRegistryGet.mockReturnValue({ executeJavaScript })
}

beforeEach(() => {
  tabStoreState.tabs = {}
  executeJavaScript.mockReset()
  webviewRegistryGet.mockReset()
})

describe('extractReaderContent', () => {
  it('returns null for empty/missing tab', async () => {
    webviewRegistryGet.mockReturnValue(null)
    const result = await extractReaderContent('nope')
    expect(result).toBeNull()
  })

  it('returns null for special pages', async () => {
    tabStoreState.tabs = { 'tab-1': { id: 'tab-1', url: 'browser://newtab', title: 'New Tab' } }
    const result = await extractReaderContent('tab-1')
    expect(result).toBeNull()
  })

  it('returns null for PDF URLs (handled by a separate extractor)', async () => {
    tabStoreState.tabs = { 'tab-1': { id: 'tab-1', url: 'https://example.com/file.pdf', title: 'Doc' } }
    const result = await extractReaderContent('tab-1')
    expect(result).toBeNull()
  })

  it('extracts the article and exposes a plain-text version', async () => {
    setupWebviewMock(ARTICLE_HTML)
    const result = await extractReaderContent('tab-1')
    expect(result).not.toBeNull()
    expect(result!.text).toBeTruthy()
    // The plain text should contain the article body, not nav/footer noise.
    expect(result!.text).toContain('The Real Story')
    expect(result!.text).toContain('actual article body')
    // Footers and nav should not dominate the plain-text output.
    expect(result!.text).not.toContain('Subscribe to our newsletter')
  })

  it('collapses whitespace in the plain-text field', async () => {
    setupWebviewMock(ARTICLE_HTML)
    const result = await extractReaderContent('tab-1')
    expect(result).not.toBeNull()
    // No runs of more than a single space — the text is a single line for the AI.
    expect(result!.text).not.toMatch(/ {2,}/)
    expect(result!.text).not.toMatch(/\n/)
  })
})
