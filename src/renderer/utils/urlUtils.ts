import { useSearchEngineStore } from '@/store/searchEngineStore'

// ─── Special Page Detection ───────────────────────────────────────────────────

/** Returns true for internal browser pages that are not rendered as webviews. */
export function isSpecialPage(url: string): boolean {
  return url === 'browser://newtab'
}

// ─── Homepage validation ───────────────────────────────────────────────────

/** Schemes that are not allowed for homepage (security / UX). */
const FORBIDDEN_HOMEPAGE_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:']

/**
 * Returns true if the input is a safe, navigable URL suitable for homepage.
 * Rejects empty, forbidden schemes, and invalid URLs. Max length 2048.
 */
export function isValidHomepageUrl(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed || trimmed.length > 2048) return false
  const lower = trimmed.toLowerCase()
  if (FORBIDDEN_HOMEPAGE_SCHEMES.some((s) => lower.startsWith(s))) return false
  try {
    const href = trimmed.includes('://') ? trimmed : `https://${trimmed}`
    const url = new URL(href)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Normalize and validate homepage input. Returns a valid https URL or empty string.
 * Use for saving: only call when isValidHomepageUrl(trimmed) is true, or pass through
 * empty; for invalid input returns '' so caller can reject.
 */
export function normalizeHomepageUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (!isValidHomepageUrl(trimmed)) return ''
  const normalized = normalizeURL(trimmed)
  return isValidHomepageUrl(normalized) ? normalized : ''
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
