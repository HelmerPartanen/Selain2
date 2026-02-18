// ─── IPC Handlers ─────────────────────────────────────────────────────────────
// All ipcMain handlers: downloads, window controls, zoom, image picker,
// wallpaper persistence, and settings store persistence.

import { app, dialog, ipcMain, nativeImage, session, shell } from 'electron'
import { readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { getMainWindow } from './state'

export function setupIPC(): void {
  // ── Download management ──────────────────────────────────────────────────
  const activeDownloads = new Map<string, Electron.DownloadItem>()
  let downloadCounter = 0

  function setupDownloadHandling(ses: Electron.Session): void {
    ses.on('will-download', (_event, item) => {
      const id = `dl-${++downloadCounter}-${Date.now()}`
      activeDownloads.set(id, item)

      getMainWindow()?.webContents.send('download-started', {
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
          getMainWindow()?.webContents.send('download-progress', {
            id,
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            speed: item.getCurrentBytesPerSecond?.() ?? 0
          })
        } else if (state === 'interrupted') {
          getMainWindow()?.webContents.send('download-progress', {
            id,
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            speed: 0
          })
        }
      })

      item.once('done', (_event, state) => {
        getMainWindow()?.webContents.send('download-done', {
          id,
          state: state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'failed'
        })
        activeDownloads.delete(id)
      })
    })
  }

  setupDownloadHandling(session.defaultSession)
  setupDownloadHandling(session.fromPartition('persist:default'))

  const VALID_DOWNLOAD_ACTIONS = new Set(['pause', 'resume', 'cancel', 'open', 'show-in-folder'])

  ipcMain.on('download-action', (_event, action: string, id: string, savePath?: string) => {
    if (!VALID_DOWNLOAD_ACTIONS.has(action)) return
    if (typeof id !== 'string' || !id) return
    const item = activeDownloads.get(id)

    if (action === 'open' && savePath) { shell.openPath(savePath); return }
    if (action === 'show-in-folder' && savePath) { shell.showItemInFolder(savePath); return }
    if (!item) return

    switch (action) {
      case 'pause': item.pause(); break
      case 'resume': item.resume(); break
      case 'cancel': item.cancel(); break
      case 'open': shell.openPath(item.getSavePath()); break
      case 'show-in-folder': shell.showItemInFolder(item.getSavePath()); break
    }
  })

  // ── Window controls ──────────────────────────────────────────────────────
  ipcMain.on('window-minimize', () => { getMainWindow()?.minimize() })
  ipcMain.on('window-maximize', () => { getMainWindow()?.maximize() })
  ipcMain.on('window-close', () => { getMainWindow()?.close() })
  ipcMain.on('window-toggle-maximize', () => {
    const win = getMainWindow()
    if (!win) return
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })

  ipcMain.on('set-zoom-factor', (_event, factor: number) => {
    getMainWindow()?.webContents.setZoomFactor(factor)
  })

  // ── Image picker dialog ──────────────────────────────────────────────────
  ipcMain.handle('open-image-dialog', async () => {
    const win = getMainWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      title: 'Choose a wallpaper image',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]!
    const buffer = await readFile(filePath)

    // Resize to max 1920px width to reduce memory usage
    let img = nativeImage.createFromBuffer(buffer)
    const size = img.getSize()
    const MAX_WIDTH = 1920
    if (size.width > MAX_WIDTH) {
      const ratio = MAX_WIDTH / size.width
      img = img.resize({ width: MAX_WIDTH, height: Math.round(size.height * ratio), quality: 'good' })
    }

    // Always output JPEG for wallpapers (smaller than PNG)
    const resizedBuffer = img.toJPEG(85)
    return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`
  })

  // ── Wallpaper persistence ────────────────────────────────────────────────
  const wallpaperPath = join(app.getPath('userData'), 'wallpaper.dat')

  ipcMain.handle('save-wallpaper', async (_event, dataUrl: string | null) => {
    try {
      if (dataUrl === null) {
        if (existsSync(wallpaperPath)) await unlink(wallpaperPath)
      } else {
        if (
          typeof dataUrl !== 'string' ||
          (!dataUrl.startsWith('data:image/') && !dataUrl.startsWith('bundled:') && dataUrl.length > 0)
        ) {
          console.warn('Invalid wallpaper data: not a data URL or bundled identifier')
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

  // ── Settings store persistence ───────────────────────────────────────────
  const ALLOWED_STORES = new Set(['browser-settings', 'search-engine', 'theme-store'])
  const storeDir = app.getPath('userData')

  ipcMain.handle('load-store', async (_event, name: string) => {
    if (typeof name !== 'string' || !ALLOWED_STORES.has(name)) return null
    const filePath = join(storeDir, `${name}.json`)
    try {
      if (!existsSync(filePath)) return null
      return await readFile(filePath, 'utf-8')
    } catch (err) {
      console.warn(`Failed to load store "${name}":`, err)
      return null
    }
  })

  ipcMain.handle('save-store', async (_event, name: string, data: string) => {
    if (typeof name !== 'string' || !ALLOWED_STORES.has(name)) return false
    if (typeof data !== 'string') return false
    const filePath = join(storeDir, `${name}.json`)
    try {
      await writeFile(filePath, data, 'utf-8')
      return true
    } catch (err) {
      console.warn(`Failed to save store "${name}":`, err)
      return false
    }
  })
}
