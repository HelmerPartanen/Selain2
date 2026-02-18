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

export function setupPermissions(): void {
  const CHROME_UA = session.defaultSession.getUserAgent()
    .replace(/Electron\/\S+\s?/g, '')
    .replace(/electron-vite\/\S+\s?/g, '')
    .trim()

  const configureSes = (ses: Electron.Session): void => {
    ses.setUserAgent(CHROME_UA)
    ses.setSpellCheckerEnabled(false)

    ses.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(ALLOWED_PERMISSIONS.has(permission))
    })

    ses.setPermissionCheckHandler((_webContents, permission) => {
      return ALLOWED_PERMISSIONS.has(permission)
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
