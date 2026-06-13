// ─── URL Display Utilities ──────────────────────────────────────────────────
//
// Split a URL into its two visual parts for the address bar:
//   1. host (bold, full color)
//   2. path/query/hash (muted, de-emphasized)
//
// The split is a single string concatenated back together at render time so
// that text selection / copy-paste behave as one URL.

export interface DisplayUrlParts {
  /** Bare hostname, e.g. "github.com". No `www.`, no scheme. */
  host: string
  /** `/path?query#hash` or empty string. Always starts with "/" or is "". */
  path: string
  /** Concatenated `host + path` ready to paste / copy. */
  full: string
  /** True if the URL is https. */
  isSecure: boolean
}

/**
 * Returns null when the URL is empty, internal (`browser://`), or `about:blank`
 * — the URL bar should not display any text in that case.
 */
export function splitDisplayUrl(raw: string): DisplayUrlParts | null {
  if (!raw || raw === 'about:blank' || raw.startsWith('browser://')) return null

  try {
    const u = new URL(raw)
    const isSecure = u.protocol === 'https:'
    const host = u.hostname.replace(/^www\./, '')
    const path = (u.pathname === '/' ? '' : u.pathname) + u.search + u.hash
    return {
      host,
      path,
      full: host + path,
      isSecure,
    }
  } catch {
    return null
  }
}
