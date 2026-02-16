import { app, BrowserWindow, ipcMain, Menu, session } from 'electron'
import { join } from 'path'

// ─── Chromium CLI Flags (must be set before app.ready) ───────────────────────

// GPU & Rendering Performance
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('disable-software-rasterizer')

// Disable background throttling so hidden webviews stay responsive
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

// Privacy: disable all telemetry, translation, sync, crash reporting
app.commandLine.appendSwitch('disable-breakpad')
app.commandLine.appendSwitch('disable-component-update')
app.commandLine.appendSwitch('disable-domain-reliability')
app.commandLine.appendSwitch('disable-features',
  'AutofillServerCommunication,TranslateUI,SpareRendererForSitePerProcess'
)

// Disable speculative features that burn CPU/memory
app.commandLine.appendSwitch('disable-ipc-flooding-protection')
app.commandLine.appendSwitch('disable-hang-monitor')

Menu.setApplicationMenu(null)

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#28282f',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#28282f',
      symbolColor: '#b0b0ba',
      height: 40
    },
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open DevTools automatically when running the dev server for debugging
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('maximize-change', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('maximize-change', false)
  })

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-attach-webview', (_event, webPreferences) => {
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
    webPreferences.sandbox = true
    webPreferences.webSecurity = true
    webPreferences.allowRunningInsecureContent = false
    webPreferences.experimentalFeatures = false
    delete webPreferences.preload
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function setupIPC(): void {
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.on('window-maximize', () => {
    mainWindow?.maximize()
  })

  ipcMain.on('window-close', () => {
    mainWindow?.close()
  })

  ipcMain.on('window-toggle-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
}

function setupPermissions(): void {
  const ses = session.defaultSession

  // Minimal permission allowlist
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = new Set([
      'clipboard-read',
      'clipboard-sanitized-write',
      'media',
      'fullscreen'
    ])
    callback(allowed.has(permission))
  })

  // Also guard permission checks (Permissions API queries)
  ses.setPermissionCheckHandler((_webContents, permission) => {
    const allowed = new Set([
      'clipboard-read',
      'clipboard-sanitized-write',
      'media',
      'fullscreen'
    ])
    return allowed.has(permission)
  })

  // Privacy: disable spellchecker download, DNS prefetch
  ses.setSpellCheckerEnabled(false)

  // Block all notification requests by default
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === 'notifications') {
      callback(false)
      return
    }
    const allowed = new Set([
      'clipboard-read',
      'clipboard-sanitized-write',
      'media',
      'fullscreen'
    ])
    callback(allowed.has(permission))
  })
}

function setupCSP(): void {
  // Only enforce CSP in production — Vite dev server requires eval/inline for HMR
  if (process.env['ELECTRON_RENDERER_URL']) return

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Only apply CSP to our own renderer, not to webview content
    const url = details.url
    if (url.startsWith('file://')) {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:"
          ]
        }
      })
    } else {
      callback({ responseHeaders: details.responseHeaders })
    }
  })
}

app.whenReady().then(() => {
  setupIPC()
  setupPermissions()
  setupCSP()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
