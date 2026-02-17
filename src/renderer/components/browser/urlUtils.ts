/** URL utilities for browser navigation */

export function normalizeURL(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return 'browser://newtab'
  if (trimmed === 'about:blank') return trimmed
  if (trimmed.startsWith('browser://')) return trimmed
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(trimmed)) return trimmed
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}/.test(trimmed)) {
    return `https://${trimmed}`
  }
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
}

/**
 * Strip protocol, www., and trailing slash for a clean unfocused display
 */
export function simplifyUrl(raw: string): string {
  if (!raw || raw === 'about:blank' || raw.startsWith('browser://')) return ''
  try {
    const u = new URL(raw)
    let host = u.hostname.replace(/^www\./, '')
    const path = u.pathname + u.search + u.hash
    const trimmedPath = path === '/' ? '' : path
    return host + trimmedPath
  } catch {
    return raw
  }
}

export function isBlankOrSpecialUrl(url: string): boolean {
  return url === 'about:blank' || url.startsWith('browser://')
}

export function isSecureUrl(url: string): boolean {
  return url.startsWith('https://')
}
