import { app, BrowserWindow, components, dialog, ipcMain, Menu, session } from 'electron'
import { readFile } from 'fs/promises'
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
// Note: component-update is needed for Widevine CDM installation via castlabs ECS
app.commandLine.appendSwitch('disable-domain-reliability')
app.commandLine.appendSwitch('disable-features',
  'AutofillServerCommunication,TranslateUI,SpareRendererForSitePerProcess'
)

// Allow autoplay for media (needed for Spotify, YouTube, etc.)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

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
    backgroundColor: '#171717',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#171717',
      symbolColor: '#b0b0ba',
      height: 40
    },
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: true,
      plugins: true,
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
    webPreferences.plugins = true
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

  // ── Image picker dialog ──
  ipcMain.handle('open-image-dialog', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose a wallpaper image',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]!
    const buffer = await readFile(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png'
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'webp' ? 'image/webp'
      : ext === 'gif' ? 'image/gif'
      : 'image/png'
    return `data:${mime};base64,${buffer.toString('base64')}`
  })

  // ── Title bar color sync ──
  ipcMain.on('set-titlebar-color', (_event, hex: string) => {
    if (!mainWindow) return
    try {
      mainWindow.setTitleBarOverlay({
        color: hex,
        symbolColor: isLightHex(hex) ? '#1c1c1e' : '#b0b0ba'
      })
    } catch {
      // setTitleBarOverlay may not be available on all platforms
    }
  })
}

/** Quick luminance check for title bar symbol color */
function isLightHex(hex: string): boolean {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.5
}

function setupPermissions(): void {
  // Chrome-compatible user-agent for DRM site compatibility
  const chromeVersion = process.versions.chrome
  const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`

  const allowedPermissions = new Set([
    'clipboard-read',
    'clipboard-sanitized-write',
    'media',
    'fullscreen',
    'media-key-system-access',
    'protected-media-identifier'
  ])

  // Apply permissions & UA to BOTH the default session AND the
  // webview partition session (persist:default is a separate session object)
  const sessions = [
    session.defaultSession,
    session.fromPartition('persist:default')
  ]

  for (const ses of sessions) {
    ses.setUserAgent(userAgent)
    ses.setSpellCheckerEnabled(false)

    ses.setPermissionRequestHandler((_wc, permission, callback, details) => {
      console.log('[Permission Request]', permission, details?.requestingUrl)
      if (permission === 'notifications') {
        callback(false)
        return
      }
      callback(allowedPermissions.has(permission))
    })

    // Permission checks must be permissive — returning false for unknown
    // permissions can silently break DRM and other subsystems
    ses.setPermissionCheckHandler((_wc, permission, _origin, details) => {
      const denied = new Set(['notifications'])
      if (denied.has(permission)) return false
      // Allow anything in our allowlist, and default-allow unknown checks
      // (Chromium uses permission checks for internal DRM plumbing)
      return true
    })
  }
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

app.whenReady().then(async () => {
  // Wait for Widevine CDM to be installed/updated (castlabs ECS)
  await components.whenReady()
  console.log('Widevine CDM ready:', components.status())

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
