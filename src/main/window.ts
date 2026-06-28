 // ─── BrowserWindow Setup ──────────────────────────────────────────────────────
 // Creates and configures the main application window, webview security
 // policies, context menus, and keyboard shortcut interception.

import { BrowserWindow } from 'electron'
import { join } from 'path'
import { setMainWindow, trackAttachedWebview } from './state'
import { buildContextMenu } from './contextMenu'
import { handleShortcutInput } from './shortcuts'
import { getBrowserUserAgent } from './permissions'

function isAllowedPopupUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)

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

function isPopupWindowRequest(features: string): boolean {
  const width = Number(features.match(/\bwidth\s*=\s*(\d+)/i)?.[1] ?? NaN)
  const height = Number(features.match(/\bheight\s*=\s*(\d+)/i)?.[1] ?? NaN)

  if (!Number.isFinite(width) || !Number.isFinite(height)) return false

  // Guard rails to avoid allowing extremely tiny or huge spoofable popups.
  return width >= 280 && width <= 1400 && height >= 280 && height <= 1400
}

export function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#1c1c1c',
    frame: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: true,
      plugins: true,
      v8CacheOptions: 'bypassHeatCheck',
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  win.maximize()

  win.once('ready-to-show', () => {
    win.show()
  })

  setMainWindow(win)

  // Open DevTools automatically in dev mode.
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  win.on('maximize', () => {
    if (!win.webContents.isDestroyed()) {
      win.webContents.send('maximize-change', true)
    }
  })

  win.on('unmaximize', () => {
    if (!win.webContents.isDestroyed()) {
      win.webContents.send('maximize-change', false)
    }
  })

  win.on('closed', () => {
    setMainWindow(null)
  })

  // Block app-shell window.open().
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  // Intercept new-window requests and keyboard shortcuts from all webviews.
  ;(win.webContents as NodeJS.EventEmitter).on(
    'did-attach-webview',
    (_event: unknown, webViewContents: Electron.WebContents) => {
      trackAttachedWebview(webViewContents)

      // Use the runtime Chromium UA from Electron.
      // Do not hard-code Chrome/120.
      webViewContents.setUserAgent(getBrowserUserAgent())

      // Redirect target="_blank" links to new tabs instead of new windows.
      // Exception: popup windows specify explicit width+height and may rely
      // on window.opener/postMessage. Allow those as real native windows.
      webViewContents.setWindowOpenHandler(({ url, features }) => {
        const isPopup = isPopupWindowRequest(features)

        if (isPopup && isAllowedPopupUrl(url)) {
          return {
            action: 'allow',
            overrideBrowserWindowOptions: {
              width: 520,
              height: 720,
              frame: true,
              show: true,
              backgroundColor: '#ffffff',
              webPreferences: {
                // Important: use the exact same Electron Session object as the opener.
                // Do not guess persist:default/private, because account profiles may use
                // persist:account-* partitions.
                session: webViewContents.session,
                contextIsolation: true,
                sandbox: true,
                nodeIntegration: false,
                webSecurity: true,
                allowRunningInsecureContent: false,
                plugins: true,
              },
            },
          }
        }

        if (url) {
          win.webContents.send('open-url-in-new-tab', {
            url,
            isPrivate: !webViewContents.session.isPersistent(),
          })
        }

        return { action: 'deny' }
      })

      // Ensure allowed popup windows also use the runtime UA and normal handlers.
      ;(webViewContents as NodeJS.EventEmitter).on(
        'did-create-window',
        (childWindow: BrowserWindow) => {
          try {
            childWindow.webContents.setUserAgent(getBrowserUserAgent())

            childWindow.webContents.on('context-menu', (_event, params) => {
              buildContextMenu(childWindow.webContents, params).popup()
            })

            childWindow.webContents.on('before-input-event', (event, input) => {
              handleShortcutInput(event, input)
            })
          } catch {
            // Popup may have closed immediately. Ignore.
          }
        },
      )

      // Right-click context menu for webview content.
      webViewContents.on('context-menu', (_event, params) => {
        buildContextMenu(webViewContents, params).popup()
      })

      // Forward keyboard shortcuts to the renderer.
      webViewContents.on('before-input-event', (event, input) => {
        handleShortcutInput(event, input)
      })
    },
  )

  // Also forward shortcuts when the host webContents itself has focus.
  win.webContents.on('before-input-event', (event, input) => {
    handleShortcutInput(event, input)
  })

  // Enforce security policies on dynamically attached webviews.
  win.webContents.on('will-attach-webview', (_event, webPreferences) => {
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
    webPreferences.sandbox = true
    webPreferences.webSecurity = true
    webPreferences.allowRunningInsecureContent = false
    webPreferences.plugins = true
    webPreferences.v8CacheOptions = 'bypassHeatCheck'

    // Never expose your app preload to remote websites.
    delete webPreferences.preload

    // Prevent a <webview useragent="..."> prop from overriding the session UA.
    delete (webPreferences as Electron.WebPreferences & { userAgent?: string }).userAgent
  })

  win.webContents.setUserAgent(getBrowserUserAgent())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}