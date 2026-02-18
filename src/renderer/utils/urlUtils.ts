import { useSearchEngineStore } from '@/store/searchEngineStore'

// ─── Special Page Detection ───────────────────────────────────────────────────

/** Returns true for internal browser pages that are not rendered as webviews. */
export function isSpecialPage(url: string): boolean {
  return url === 'browser://newtab'
}

// ─── URL Normalization ────────────────────────────────────────────────────────

/**
 * Normalize raw URL bar input into a fully-qualified URL.
 * Handles: empty input, about:blank, browser://, full URLs,
 * bare domain guesses, and search queries.
 */
export function normalizeURL(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return 'browser://newtab'
  if (trimmed === 'about:blank') return trimmed
  if (trimmed.startsWith('browser://')) return trimmed
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(trimmed)) return trimmed
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.([a-zA-Z]{2,})/.test(trimmed)) {
    return `https://${trimmed}`
  }
  return useSearchEngineStore.getState().getSearchUrl(trimmed)
}

// ─── Display URL ─────────────────────────────────────────────────────────────

/**
 * Simplify a full URL into a readable display string.
 * Strips protocol, `www.` prefix, and trailing `/`.
 * Returns empty string for internal/blank URLs.
 */
export function simplifyUrl(raw: string): string {
  if (!raw || raw === 'about:blank' || raw.startsWith('browser://')) return ''
  try {
    const u = new URL(raw)
    const host = u.hostname.replace(/^www\./, '')
    const path = u.pathname + u.search + u.hash
    const trimmedPath = path === '/' ? '' : path
    return host + trimmedPath
  } catch {
    return raw
  }
}
