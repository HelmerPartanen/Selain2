// ─── Permissions & CSP ────────────────────────────────────────────────────────
// Sets Chrome-compatible user agent, disables spell checker, configures
// permission handlers for both sessions, and applies CSP headers in prod.

import { session } from 'electron'

const ALLOWED_PERMISSIONS = new Set([
  'clipboard-read',
  'clipboard-sanitized-write',
  'media',
  'fullscreen',
  'media-key-system-access',
  'protected-media-identifier'
])

function isSecureTrustedOrigin(urlString: string | undefined): boolean {
  if (!urlString) return false
  try {
    const url = new URL(urlString)
    if (url.protocol === 'https:') return true
    if (url.protocol === 'file:') return true
    if (url.protocol === 'http:') {
      return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
    }
    return false
  } catch {
    return false
  }
}

function shouldAllowPermission(permission: string, requestingUrl: string | undefined): boolean {
  if (!ALLOWED_PERMISSIONS.has(permission)) return false

  // Fullscreen itself is a low-risk UI permission and expected on many sites.
  if (permission === 'fullscreen') return true

  // Sensitive capabilities are restricted to secure/trusted origins.
  return isSecureTrustedOrigin(requestingUrl)
}

export function setupPermissions(): void {
  const CHROME_UA = session.defaultSession.getUserAgent()
    .replace(/Electron\/\S+\s?/g, '')
    .replace(/electron-vite\/\S+\s?/g, '')
    .trim()

  const configureSes = (ses: Electron.Session): void => {
    ses.setUserAgent(CHROME_UA)
    ses.setSpellCheckerEnabled(false)

    ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const requestingUrl = details?.requestingUrl ?? webContents.getURL()
      callback(shouldAllowPermission(permission, requestingUrl))
    })

    ses.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
      const requestingUrl = details?.requestingUrl ?? requestingOrigin ?? webContents?.getURL()
      return shouldAllowPermission(permission, requestingUrl)
    })
  }

  configureSes(session.defaultSession)
  configureSes(session.fromPartition('persist:default'))
}

export function setupCSP(): void {
  // Only enforce CSP in production (dev uses ELECTRON_RENDERER_URL)
  if (process.env['ELECTRON_RENDERER_URL']) return

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Only apply to the renderer's local file URLs
    if (!details.url.startsWith('file://')) {
      callback({ cancel: false })
      return
    }

    callback({
      cancel: false,
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';" +
          " script-src 'self' 'unsafe-inline';" +
          " style-src 'self' 'unsafe-inline';" +
          " img-src 'self' data: blob: https:;" +
          " font-src 'self' data:;" +
          " connect-src 'self' https: ws:;" +
          " media-src 'self' blob: https:;" +
          " frame-src 'none';"
        ]
      }
    })
  })
}
