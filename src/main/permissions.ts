// ─── Permissions & CSP ────────────────────────────────────────────────────────
// Sets Chrome-compatible user agent, disables spell checker, configures
// permission handlers for both sessions, and applies CSP headers in prod.

import { ipcMain, session } from 'electron'
import { getMainWindow } from './state'

const ALLOWED_PERMISSIONS = new Set([
  'clipboard-read',
  'clipboard-sanitized-write',
  'media',
  'fullscreen',
  'media-key-system-access',
  'protected-media-identifier',
])

function isSecureTrustedOrigin(urlString: string | undefined): boolean {
  if (!urlString) return false
  try {
    const url = new URL(urlString)
    if (url.protocol === 'https:') return true
    if (url.protocol === 'http:') {
      return (
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '[::1]'
      )
    }
    return false
  } catch {
    return false
  }
}

function shouldAllowPermission(
  permission: string,
  requestingUrl: string | undefined,
): boolean {
  if (!ALLOWED_PERMISSIONS.has(permission)) return false

  // Fullscreen itself is a low-risk UI permission and expected on many sites.
  if (permission === 'fullscreen') return true

  // Sensitive capabilities are restricted to secure/trusted origins.
  return isSecureTrustedOrigin(requestingUrl)
}

const pendingPermissionRequests = new Map<string, (decision: boolean) => void>()

function askRendererForPermission(
  permission: string,
  requestingUrl: string | undefined,
  fallback: (decision: boolean) => void,
): void {
  const win = getMainWindow()
  if (!win || !requestingUrl) {
    fallback(false)
    return
  }
  const origin = (() => {
    try {
      return new URL(requestingUrl).origin
    } catch {
      return requestingUrl
    }
  })()
  const id = `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const timer = setTimeout(() => {
    pendingPermissionRequests.delete(id)
    fallback(false)
  }, 15000)
  pendingPermissionRequests.set(id, (decision) => {
    clearTimeout(timer)
    fallback(decision)
  })
  win.webContents.send('permission-request', {
    id,
    origin,
    permission,
    requestingUrl,
  })
}

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

let responseHandlerRegistered = false

export function configureBrowserSession(ses: Electron.Session): void {
  ses.setUserAgent(CHROME_UA)
  ses.setSpellCheckerEnabled(false)

  ses.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const requestingUrl = details?.requestingUrl ?? webContents.getURL()
      if (!shouldAllowPermission(permission, requestingUrl)) {
        callback(false)
        return
      }
      if (permission === 'fullscreen') {
        callback(true)
        return
      }
      askRendererForPermission(permission, requestingUrl, callback)
    },
  )

  ses.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      const requestingUrl =
        details?.requestingUrl ?? requestingOrigin ?? webContents?.getURL()
      return shouldAllowPermission(permission, requestingUrl)
    },
  )
}

export function setupPermissions(): void {
  if (!responseHandlerRegistered) ipcMain.on('permission-response', (event, id: unknown, decision: unknown) => {
    const win = getMainWindow()
    if (!win || event.sender.id !== win.webContents.id) return
    if (typeof id !== 'string') return
    const resolver = pendingPermissionRequests.get(id)
    if (!resolver) return
    pendingPermissionRequests.delete(id)
    resolver(decision === 'allow')
  })
  responseHandlerRegistered = true

  configureBrowserSession(session.defaultSession)
  configureBrowserSession(session.fromPartition('persist:default'))
  configureBrowserSession(session.fromPartition('private'))
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
            " frame-src 'none';",
        ],
      },
    })
  })

  // Also register on persist:default so the app-shell CSP applies if it ever
  // loads via this session. External (non-file://) requests pass through unmodified.
  session
    .fromPartition('persist:default')
    .webRequest.onHeadersReceived((details, callback) => {
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
              " frame-src 'none';",
          ],
        },
      })
    })
}
