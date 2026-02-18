// ─── BrowserWindow Setup ──────────────────────────────────────────────────────
// Creates and configures the main application window, webview security
// policies, context menus, and keyboard shortcut interception.

import { BrowserWindow } from 'electron'
import { join } from 'path'
import { setMainWindow } from './state'
import { buildContextMenu } from './contextMenu'
import { handleShortcutInput } from './shortcuts'

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
      preload: join(__dirname, '../preload/index.js')
    }
  })

  setMainWindow(win)

  win.on('ready-to-show', () => {
    win.show()
  })

  // Open DevTools automatically in dev mode
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  win.on('maximize', () => {
    win.webContents.send('maximize-change', true)
  })

  win.on('unmaximize', () => {
    win.webContents.send('maximize-change', false)
  })

  // Block renderer-initiated window.open()
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  // Intercept new-window requests and keyboard shortcuts from all webviews
  ;(win.webContents as NodeJS.EventEmitter).on('did-attach-webview', (_event: unknown, webViewContents: Electron.WebContents) => {
    // Redirect target="_blank" links to new tabs instead of new windows
    webViewContents.setWindowOpenHandler(({ url }) => {
      win.webContents.send('open-url-in-new-tab', url)
      return { action: 'deny' }
    })

    // Right-click context menu for webview content
    webViewContents.on('context-menu', (_event, params) => {
      buildContextMenu(webViewContents, params).popup()
    })

    // Forward keyboard shortcuts to the renderer (webview focus absorbs keydown)
    webViewContents.on('before-input-event', (event, input) => {
      handleShortcutInput(event, input)
    })
  })

  // Also forward shortcuts when the host webContents itself has focus
  win.webContents.on('before-input-event', (event, input) => {
    handleShortcutInput(event, input)
  })

  // Enforce security policies on dynamically attached webviews
  win.webContents.on('will-attach-webview', (_event, webPreferences) => {
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
    webPreferences.sandbox = true
    webPreferences.webSecurity = true
    webPreferences.allowRunningInsecureContent = false
    webPreferences.plugins = true
    webPreferences.v8CacheOptions = 'bypassHeatCheck'
    delete webPreferences.preload
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
