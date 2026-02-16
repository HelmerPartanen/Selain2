import { app, BrowserWindow, ipcMain, Menu, session } from 'electron'
import { join } from 'path'

Menu.setApplicationMenu(null)

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#09090b',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#09090b',
      symbolColor: '#a1a1aa',
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
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowedPermissions: string[] = [
      'clipboard-read',
      'clipboard-sanitized-write',
      'media',
      'fullscreen'
    ]
    callback(allowedPermissions.includes(permission))
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
