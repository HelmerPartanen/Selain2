import { describe, it, expect, vi } from 'vitest'
import { normalizeURL, simplifyUrl, isSpecialPage } from './urlUtils'

// Mock the search engine store
vi.mock('@/store/searchEngineStore', () => ({
  useSearchEngineStore: {
    getState: () => ({
      getSearchUrl: (query: string) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
    })
  }
}))

describe('urlUtils', () => {
  describe('isSpecialPage', () => {
    it('returns true for newtab', () => {
      expect(isSpecialPage('browser://newtab')).toBe(true)
    })
    it('returns false for normal urls', () => {
      expect(isSpecialPage('https://example.com')).toBe(false)
    })
  })

  describe('normalizeURL', () => {
    it('handles empty input', () => {
      expect(normalizeURL('')).toBe('browser://newtab')
      expect(normalizeURL('   ')).toBe('browser://newtab')
    })

    it('handles about:blank', () => {
      expect(normalizeURL('about:blank')).toBe('about:blank')
    })

    it('handles browser:// urls', () => {
      expect(normalizeURL('browser://settings')).toBe('browser://settings')
    })

    it('handles full URLs', () => {
      expect(normalizeURL('https://example.com')).toBe('https://example.com')
      expect(normalizeURL('http://localhost:3000')).toBe('http://localhost:3000')
      expect(normalizeURL('file:///C:/test.txt')).toBe('file:///C:/test.txt')
    })

    it('adds https:// to bare domains', () => {
      expect(normalizeURL('example.com')).toBe('https://example.com')
      expect(normalizeURL('test.co.uk')).toBe('https://test.co.uk')
      expect(normalizeURL('sub.domain.org')).toBe('https://sub.domain.org')
    })

    it('treats non-domains as search queries', () => {
      expect(normalizeURL('hello world')).toBe('https://duckduckgo.com/?q=hello%20world')
      expect(normalizeURL('test')).toBe('https://duckduckgo.com/?q=test')
      expect(normalizeURL('what is the weather')).toBe('https://duckduckgo.com/?q=what%20is%20the%20weather')
    })
  })

  describe('simplifyUrl', () => {
    it('returns empty string for special urls', () => {
      expect(simplifyUrl('')).toBe('')
      expect(simplifyUrl('about:blank')).toBe('')
      expect(simplifyUrl('browser://newtab')).toBe('')
    })

    it('strips protocol and www', () => {
      expect(simplifyUrl('https://www.example.com')).toBe('example.com')
      expect(simplifyUrl('http://www.test.com')).toBe('test.com')
      expect(simplifyUrl('https://sub.example.com')).toBe('sub.example.com')
    })

    it('keeps path and query params', () => {
      expect(simplifyUrl('https://example.com/path/to/page')).toBe('example.com/path/to/page')
      expect(simplifyUrl('https://example.com/search?q=test')).toBe('example.com/search?q=test')
      expect(simplifyUrl('https://example.com/#hash')).toBe('example.com/#hash')
    })

    it('strips trailing slash for root path', () => {
      expect(simplifyUrl('https://example.com/')).toBe('example.com')
    })

    it('returns raw string if parsing fails', () => {
      expect(simplifyUrl('not a valid url')).toBe('not a valid url')
    })
  })
})
