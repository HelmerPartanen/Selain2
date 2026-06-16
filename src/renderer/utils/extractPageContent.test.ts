import { describe, it, expect } from 'vitest'
import { isLikelyPdfUrl } from './extractPageContent'

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
