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
