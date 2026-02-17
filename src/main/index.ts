import { app, BrowserWindow, clipboard, components, dialog, ipcMain, Menu, nativeImage, session, shell } from 'electron'
import { readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// ─── Context menu builder ────────────────────────────────────────────────────

function buildContextMenu(
  webContents: Electron.WebContents,
  params: Electron.ContextMenuParams
): Electron.Menu {
  const template: Electron.MenuItemConstructorOptions[] = []
  const { editFlags } = params

  // ── Link context ──
  if (params.linkURL) {
    template.push(
      {
        label: 'Open Link in New Tab',
        click: () => mainWindow?.webContents.send('open-url-in-new-tab', params.linkURL)
      },
      { type: 'separator' },
      {
        label: 'Copy Link Address',
        click: () => clipboard.writeText(params.linkURL)
      },
      {
        label: 'Save Link As\u2026',
        click: () => webContents.downloadURL(params.linkURL)
      },
      { type: 'separator' }
    )
  }

  // ── Image context ──
  if (params.hasImageContents && params.srcURL) {
    template.push(
      {
        label: 'Open Image in New Tab',
        click: () => mainWindow?.webContents.send('open-url-in-new-tab', params.srcURL)
      },
      {
        label: 'Save Image As\u2026',
        click: () => webContents.downloadURL(params.srcURL)
      },
      {
        label: 'Copy Image',
        click: () => webContents.copyImageAt(params.x, params.y)
      },
      {
        label: 'Copy Image Address',
        click: () => clipboard.writeText(params.srcURL)
      },
      { type: 'separator' }
    )
  }

  // ── Audio / Video context ──
  if (params.mediaType === 'audio' || params.mediaType === 'video') {
    template.push(
      {
        label: params.mediaFlags.isPaused ? 'Play' : 'Pause',
        click: () => webContents.executeJavaScript(
          `document.elementFromPoint(${params.x},${params.y})?.${params.mediaFlags.isPaused ? 'play()' : 'pause()'}`
        )
      },
      {
        label: params.mediaFlags.isMuted ? 'Unmute' : 'Mute',
        click: () => webContents.executeJavaScript(
          `{const m=document.elementFromPoint(${params.x},${params.y});if(m)m.muted=${!params.mediaFlags.isMuted}}`
        )
      },
      {
        label: 'Loop',
        type: 'checkbox',
        checked: params.mediaFlags.isLooping,
        click: () => webContents.executeJavaScript(
          `{const m=document.elementFromPoint(${params.x},${params.y});if(m)m.loop=${!params.mediaFlags.isLooping}}`
        )
      },
      {
        label: 'Show Controls',
        type: 'checkbox',
        checked: params.mediaFlags.isControlsVisible,
        click: () => webContents.executeJavaScript(
          `{const m=document.elementFromPoint(${params.x},${params.y});if(m)m.controls=${!params.mediaFlags.isControlsVisible}}`
        )
      },
      { type: 'separator' },
      {
        label: 'Copy Media Address',
        click: () => clipboard.writeText(params.srcURL)
      },
      {
        label: 'Open Media in New Tab',
        click: () => mainWindow?.webContents.send('open-url-in-new-tab', params.srcURL)
      },
      { type: 'separator' }
    )
  }

  // ── Editable field context ──
  if (params.isEditable) {
    template.push(
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', enabled: editFlags.canUndo, click: () => webContents.undo() },
      { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', enabled: editFlags.canRedo, click: () => webContents.redo() },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', enabled: editFlags.canCut, click: () => webContents.cut() },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', enabled: editFlags.canCopy, click: () => webContents.copy() },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', enabled: editFlags.canPaste, click: () => webContents.paste() },
      { label: 'Delete', enabled: editFlags.canDelete, click: () => webContents.delete() },
      { type: 'separator' },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A', enabled: editFlags.canSelectAll, click: () => webContents.selectAll() }
    )
  } else if (params.selectionText) {
    // ── Selection context (non-editable) ──
    template.push(
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => webContents.copy() }
    )

    const trimmed = params.selectionText.trim()
    if (trimmed.length > 0) {
      const display = trimmed.length > 30 ? trimmed.slice(0, 30) + '\u2026' : trimmed
      template.push({
        label: `Search Google for \u201C${display}\u201D`,
        click: () => {
          const query = encodeURIComponent(trimmed)
          mainWindow?.webContents.send('open-url-in-new-tab', `https://www.google.com/search?q=${query}`)
        }
      })
    }
    template.push({ type: 'separator' })
  }

  // ── Navigation ──
  template.push(
    { label: 'Back', accelerator: 'Alt+Left', enabled: webContents.canGoBack(), click: () => webContents.goBack() },
    { label: 'Forward', accelerator: 'Alt+Right', enabled: webContents.canGoForward(), click: () => webContents.goForward() },
    { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => webContents.reload() },
    { type: 'separator' }
  )

  // ── Page actions ──
  template.push(
    {
      label: 'Save Page As\u2026',
      accelerator: 'CmdOrCtrl+S',
      click: async () => {
        if (!mainWindow) return
        const result = await dialog.showSaveDialog(mainWindow, {
          defaultPath: (webContents.getTitle() || 'page').replace(/[/\\?%*:|"<>]/g, '_') + '.html',
          filters: [
            { name: 'HTML', extensions: ['html', 'htm'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        })
        if (!result.canceled && result.filePath) {
          webContents.savePage(result.filePath, 'HTMLComplete')
        }
      }
    },
    {
      label: 'Print\u2026',
      accelerator: 'CmdOrCtrl+P',
      click: () => webContents.print()
    },
    { type: 'separator' }
  )

  // ── Developer ──
  template.push(
    {
      label: 'View Page Source',
      click: () => {
        const url = webContents.getURL()
        if (url) mainWindow?.webContents.send('open-url-in-new-tab', `view-source:${url}`)
      }
    },
    {
      label: 'Inspect Element',
      click: () => {
        webContents.inspectElement(params.x, params.y)
      }
    }
  )

  return Menu.buildFromTemplate(template)
}

// ─── Shortcut detection (shared between webview and main webContents) ────────

const CTRL_KEYS = new Set(['t', 'w', 'l', 'f', 'r'])
const CTRL_SHIFT_KEYS = new Set(['t', 's', 'a'])
const ALT_KEYS = new Set(['arrowleft', 'arrowright'])
const DIGIT_RE = /^[1-9]$/

function handleShortcutInput(
  event: Electron.Event,
  input: Electron.Input
): void {
  if (input.type !== 'keyDown' || !mainWindow) return

  const ctrl = input.control || input.meta
  const shift = input.shift
  const alt = input.alt
  const key = input.key.toLowerCase()

  const isShortcut =
    (ctrl && !shift && CTRL_KEYS.has(key)) ||
    (ctrl && shift && CTRL_SHIFT_KEYS.has(key)) ||
    (ctrl && key === 'tab') ||
    (ctrl && !shift && DIGIT_RE.test(input.key)) ||
    (!ctrl && key === 'f5') ||
    (alt && !ctrl && ALT_KEYS.has(key)) ||
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
}

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

// V8 & Blink Performance Features
app.commandLine.appendSwitch('enable-features',
  'V8VmFuture,BackForwardCache,BlinkSchedulerHighPriorityInput,CanvasOopRasterization,UseSkiaRenderer'
)
app.commandLine.appendSwitch('js-flags',
  '--maglev --turbofan --max-old-space-size=4096'
)
app.commandLine.appendSwitch('renderer-process-limit', '0')
app.commandLine.appendSwitch('enable-quic')

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

  // Intercept new-window requests from <webview> tags and open them as new tabs
  // AND forward keyboard shortcuts from webviews to the renderer
  ;(mainWindow.webContents as NodeJS.EventEmitter).on('did-attach-webview', (_event: unknown, webViewContents: Electron.WebContents) => {
    webViewContents.setWindowOpenHandler(({ url }) => {
      mainWindow?.webContents.send('open-url-in-new-tab', url)
      return { action: 'deny' }
    })

    // ── Right-click context menu for webview content ──
    webViewContents.on('context-menu', (_event, params) => {
      const menu = buildContextMenu(webViewContents, params)
      menu.popup()
    })

    // When a <webview> has focus, keydown events never reach mainWindow.webContents.
    // Intercept them on each webview's own webContents and forward to the renderer.
    webViewContents.on('before-input-event', (event, input) => {
      handleShortcutInput(event, input)
    })
  })

  // ── Forward keyboard shortcuts from webviews to the renderer ──
  // When a <webview> has focus, keydown events never reach the renderer window.
  // We intercept them here via before-input-event on the host webContents and
  // forward matching combos as IPC so the renderer can handle them.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    handleShortcutInput(event, input)
  })

  mainWindow.webContents.on('will-attach-webview', (_event, webPreferences) => {
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

  const VALID_DOWNLOAD_ACTIONS = new Set(['pause', 'resume', 'cancel', 'open', 'show-in-folder'])

  ipcMain.on('download-action', (_event, action: string, id: string, savePath?: string) => {
    if (!VALID_DOWNLOAD_ACTIONS.has(action)) return
    if (typeof id !== 'string' || !id) return
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
        if (typeof dataUrl !== 'string' || (!dataUrl.startsWith('data:image/') && dataUrl.length > 0)) {
          console.warn('Invalid wallpaper data: not a data URL')
          return false
        }
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

    // Permission checks: allow only known-safe permissions, deny everything else.
    // DRM subsystems use 'media-key-system-access' and 'protected-media-identifier'
    // which are in our allowlist — no need for a blanket allow-all.
    ses.setPermissionCheckHandler((_wc, permission, _origin, _details) => {
      const denied = new Set(['notifications'])
      if (denied.has(permission)) return false
      return allowedPermissions.has(permission)
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

  // ── Load bundled extensions into the webview session ──
  // Pass --no-extensions CLI flag to skip loading extensions (useful for benchmarking)
  const skipExtensions = process.argv.includes('--no-extensions')

  if (!skipExtensions) {
    const extensionsDir = app.isPackaged
      ? join(process.resourcesPath, 'uBlock0.chromium')
      : join(__dirname, '../../uBlock0.chromium')

    if (existsSync(extensionsDir)) {
      try {
        const ext = await session.fromPartition('persist:default').loadExtension(extensionsDir, {
          allowFileAccess: true
        })
        console.log(`[Extension] Loaded: ${ext.name} v${ext.version}`)
      } catch (err) {
        console.warn('[Extension] Failed to load uBlock Origin:', err)
      }
    } else {
      console.warn('[Extension] uBlock0.chromium directory not found at', extensionsDir)
    }
  } else {
    console.log('[Extension] Skipped loading extensions (--no-extensions flag)')
  }

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
