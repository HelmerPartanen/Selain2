import { app, BrowserWindow, components, dialog, ipcMain, Menu, nativeImage, session, shell } from 'electron'
import { readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// ─── Chromium CLI Flags (must be set before app.ready) ───────────────────────

// GPU & Rendering Performance
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('disable-software-rasterizer')

// NOTE: Background throttling is intentionally re-enabled (defaults).
// Hidden/suspended webviews should be throttled to save CPU/RAM.
// The LRU tab manager handles tab suspension separately.

// Privacy: disable all telemetry, translation, sync, crash reporting
app.commandLine.appendSwitch('disable-breakpad')
// Note: component-update is needed for Widevine CDM installation via castlabs ECS
app.commandLine.appendSwitch('disable-domain-reliability')
app.commandLine.appendSwitch('disable-features',
  'AutofillServerCommunication,TranslateUI,SpareRendererForSitePerProcess'
)

// Allow autoplay for media (needed for Spotify, YouTube, etc.)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// Keep IPC flooding protection and hang monitor enabled for stability

Menu.setApplicationMenu(null)

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#00000000',
    frame: false,
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

  // ── Forward keyboard shortcuts from webviews to the renderer ──
  // When a <webview> has focus, keydown events never reach the renderer window.
  // We intercept them here via before-input-event on the host webContents and
  // forward matching combos as IPC so the renderer can handle them.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !mainWindow) return

    const ctrl = input.control || input.meta
    const shift = input.shift
    const alt = input.alt
    const key = input.key.toLowerCase()

    const isShortcut =
      (ctrl && !shift && (key === 't' || key === 'w' || key === 'l' || key === 'f' || key === 'r')) ||
      (ctrl && shift && (key === 't' || key === 's')) ||
      (ctrl && key === 'tab') ||
      (ctrl && !shift && /^[1-9]$/.test(input.key)) ||
      (!ctrl && key === 'f5') ||
      (alt && !ctrl && (key === 'arrowleft' || key === 'arrowright')) ||
      (key === 'escape')

    if (isShortcut) {
      event.preventDefault()
      mainWindow.webContents.send('shortcut-pressed', {
        key: input.key,
        code: input.code,
        ctrlKey: input.control,
        metaKey: input.meta,
        shiftKey: input.shift,
        altKey: input.alt
      })
    }
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
  // ── Download management ──
  const activeDownloads = new Map<string, Electron.DownloadItem>()
  let downloadCounter = 0

  function setupDownloadHandling(ses: Electron.Session): void {
    ses.on('will-download', (_event, item) => {
      const id = `dl-${++downloadCounter}-${Date.now()}`

      activeDownloads.set(id, item)

      mainWindow?.webContents.send('download-started', {
        id,
        filename: item.getFilename(),
        url: item.getURL(),
        savePath: item.getSavePath(),
        totalBytes: item.getTotalBytes(),
        receivedBytes: item.getReceivedBytes(),
        startTime: Date.now()
      })

      let lastUpdate = 0
      item.on('updated', (_event, state) => {
        const now = Date.now()
        if (now - lastUpdate < 250 && state === 'progressing') return
        lastUpdate = now

        if (state === 'progressing') {
          mainWindow?.webContents.send('download-progress', {
            id,
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            speed: item.getCurrentBytesPerSecond?.() ?? 0
          })
        } else if (state === 'interrupted') {
          mainWindow?.webContents.send('download-progress', {
            id,
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            speed: 0
          })
        }
      })

      item.once('done', (_event, state) => {
        mainWindow?.webContents.send('download-done', {
          id,
          state: state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'failed'
        })
        activeDownloads.delete(id)
      })
    })
  }

  // Set up downloads for both sessions
  setupDownloadHandling(session.defaultSession)
  setupDownloadHandling(session.fromPartition('persist:default'))

  ipcMain.on('download-action', (_event, action: string, id: string, savePath?: string) => {
    const item = activeDownloads.get(id)
    if (action === 'open' && savePath) {
      shell.openPath(savePath)
      return
    }
    if (action === 'show-in-folder' && savePath) {
      shell.showItemInFolder(savePath)
      return
    }
    if (!item) return
    switch (action) {
      case 'pause': item.pause(); break
      case 'resume': item.resume(); break
      case 'cancel': item.cancel(); break
      case 'open': shell.openPath(item.getSavePath()); break
      case 'show-in-folder': shell.showItemInFolder(item.getSavePath()); break
    }
  })
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

    // Resize large images to max 1920px width to reduce memory usage
    // nativeImage handles decoding efficiently in the main process
    let img = nativeImage.createFromBuffer(buffer)
    const size = img.getSize()
    const MAX_WIDTH = 1920
    if (size.width > MAX_WIDTH) {
      const ratio = MAX_WIDTH / size.width
      img = img.resize({ width: MAX_WIDTH, height: Math.round(size.height * ratio), quality: 'good' })
    }

    // Always output as JPEG for wallpapers (smaller than PNG)
    const resizedBuffer = img.toJPEG(85)
    return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`
  })

  // ── Wallpaper persistence (filesystem-based, replaces IndexedDB) ──
  const wallpaperPath = join(app.getPath('userData'), 'wallpaper.dat')

  ipcMain.handle('save-wallpaper', async (_event, dataUrl: string | null) => {
    try {
      if (dataUrl === null) {
        if (existsSync(wallpaperPath)) await unlink(wallpaperPath)
      } else {
        await writeFile(wallpaperPath, dataUrl, 'utf-8')
      }
      return true
    } catch (err) {
      console.warn('Failed to save wallpaper:', err)
      return false
    }
  })

  ipcMain.handle('load-wallpaper', async () => {
    try {
      if (!existsSync(wallpaperPath)) return null
      return await readFile(wallpaperPath, 'utf-8')
    } catch (err) {
      console.warn('Failed to load wallpaper:', err)
      return null
    }
  })
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
  // Start CDM init in background — don't block window creation
  const cdmReady = components.whenReady().then(() => {
    console.log('Widevine CDM ready:', components.status())
  }).catch((err) => {
    console.warn('Widevine CDM init failed (DRM may be unavailable):', err)
  })

  setupIPC()
  setupPermissions()
  setupCSP()
  createWindow()

  // Ensure CDM is ready before any DRM playback is attempted
  await cdmReady

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
