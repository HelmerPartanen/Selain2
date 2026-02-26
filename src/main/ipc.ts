// ─── IPC Handlers ─────────────────────────────────────────────────────────────
// All ipcMain handlers: downloads, window controls, zoom, image picker,
// wallpaper persistence, and settings store persistence.

import { app, dialog, ipcMain, nativeImage, session, shell, webContents, net } from 'electron'
import { readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync, writeFileSync } from 'fs'
import { logger } from './logger'
import { getMainWindow } from './state'
import { getLatestPerfSnapshot, getPerfSnapshots, startPerfMonitor, stopPerfMonitor } from './perfMonitor'
import { setupAIIPC } from './ai/ipcAI'

const PERF_LOGS = process.env['BROWSER_PERF_LOG'] === '1'

const storePerf = {
  saveRequests: 0,
  written: 0,
  skippedNoChange: 0,
  loadHits: 0,
  loadMisses: 0,
  saveErrors: 0
}

const savedStoreCache = new Map<string, string>()

function startPerfLogging(): void {
  if (!PERF_LOGS) return
  setInterval(() => {
    logger.log('[perf][main][store]', {
      ...storePerf,
      cachedStores: savedStoreCache.size
    })
  }, 10000)
}

function sendToMainWindow(channel: string, payload: unknown): void {
  const win = getMainWindow()
  if (!win || win.isDestroyed()) return
  if (win.webContents.isDestroyed()) return
  win.webContents.send(channel, payload)
}

export function setupIPC(): void {
  startPerfLogging()
  setupAIIPC()

  // ── Download management ──────────────────────────────────────────────────
  const activeDownloads = new Map<string, Electron.DownloadItem>()
  const knownDownloadPaths = new Map<string, string>()
  let downloadCounter = 0

  function setupDownloadHandling(ses: Electron.Session): void {
    ses.on('will-download', (_event, item) => {
      const id = `dl-${++downloadCounter}-${Date.now()}`
      activeDownloads.set(id, item)
      const initialPath = item.getSavePath()
      if (initialPath) knownDownloadPaths.set(id, initialPath)

      sendToMainWindow('download-started', {
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
        const currentPath = item.getSavePath()
        if (currentPath) knownDownloadPaths.set(id, currentPath)

        if (state === 'progressing') {
          sendToMainWindow('download-progress', {
            id,
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            speed: item.getCurrentBytesPerSecond?.() ?? 0
          })
        } else if (state === 'interrupted') {
          sendToMainWindow('download-progress', {
            id,
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            speed: 0
          })
        }
      })

      item.once('done', (_event, state) => {
        const finalPath = item.getSavePath()
        if (finalPath) knownDownloadPaths.set(id, finalPath)
        sendToMainWindow('download-done', {
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

  ipcMain.on('download-action', (_event, action: string, id: string, _savePath?: string) => {
    if (!VALID_DOWNLOAD_ACTIONS.has(action)) return
    if (typeof id !== 'string' || !id) return
    const item = activeDownloads.get(id)
    const trackedPath = knownDownloadPaths.get(id) ?? item?.getSavePath()
    if (trackedPath) knownDownloadPaths.set(id, trackedPath)

    // Never trust renderer-supplied file paths for shell actions.
    if (action === 'open' || action === 'show-in-folder') {
      if (!trackedPath) return
      if (action === 'open') {
        shell.openPath(trackedPath)
      } else {
        shell.showItemInFolder(trackedPath)
      }
      return
    }
    if (!item) return

    switch (action) {
      case 'pause': item.pause(); break
      case 'resume': item.resume(); break
      case 'cancel': item.cancel(); break
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
          logger.warn('Invalid wallpaper data: not a data URL or bundled identifier')
          return false
        }
        await writeFile(wallpaperPath, dataUrl, 'utf-8')
      }
      return true
    } catch (err) {
      logger.warn('Failed to save wallpaper:', err)
      return false
    }
  })

  ipcMain.handle('load-wallpaper', async () => {
    try {
      if (!existsSync(wallpaperPath)) return null
      return await readFile(wallpaperPath, 'utf-8')
    } catch (err) {
      logger.warn('Failed to load wallpaper:', err)
      return null
    }
  })

  // ── Settings store persistence ───────────────────────────────────────────
  const ALLOWED_STORES = new Set([
    'browser-settings',
    'search-engine',
    'theme-store',
    'tab-session',
    'bookmark-store',
    'browser-history',
    'download-history',
    'space-store'
  ])
  const storeDir = app.getPath('userData')

  ipcMain.on('clear-stores-sync', (event, names: unknown) => {
    const list = Array.isArray(names) ? names : []
    try {
      for (const name of list) {
        if (typeof name !== 'string') continue
        if (!ALLOWED_STORES.has(name)) continue
        const filePath = join(storeDir, `${name}.json`)
        writeFileSync(filePath, 'null', 'utf-8')
        savedStoreCache.set(name, 'null')
      }
      event.returnValue = true
    } catch {
      event.returnValue = false
    }
  })

  ipcMain.handle('load-store', async (_event, name: string) => {
    if (typeof name !== 'string' || !ALLOWED_STORES.has(name)) return null
    const filePath = join(storeDir, `${name}.json`)
    try {
      if (!existsSync(filePath)) {
        storePerf.loadMisses += 1
        return null
      }
      const data = await readFile(filePath, 'utf-8')
      savedStoreCache.set(name, data)
      storePerf.loadHits += 1
      return data
    } catch (err) {
      logger.warn(`Failed to load store "${name}":`, err)
      return null
    }
  })

  ipcMain.handle('save-store', async (_event, name: string, data: string) => {
    if (typeof name !== 'string' || !ALLOWED_STORES.has(name)) return false
    if (typeof data !== 'string') return false
    storePerf.saveRequests += 1

    const cached = savedStoreCache.get(name)
    if (cached === data) {
      storePerf.skippedNoChange += 1
      return true
    }

    const filePath = join(storeDir, `${name}.json`)
    try {
      await writeFile(filePath, data, 'utf-8')
      savedStoreCache.set(name, data)
      storePerf.written += 1
      return true
    } catch (err) {
      storePerf.saveErrors += 1
      logger.warn(`Failed to save store "${name}":`, err)
      return false
    }
  })

  // ── Picture-in-Picture ──────────────────────────────────────────────────
  ipcMain.on('request-pip', (_event, webContentsId: number) => {
    const wc = webContents.fromId(webContentsId)
    if (!wc) return
    wc.executeJavaScript(`
      (function() {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          if (!v.paused && v.readyState >= 2) {
            v.requestPictureInPicture().catch(() => {});
            return;
          }
        }
        if (videos.length > 0) videos[0].requestPictureInPicture().catch(() => {});
      })()
    `)
  })

  // ── Renderer Fixes (Main Process side) ──────────────────────────────────
  ipcMain.handle('fetch-search-suggestions', async (_event, query: string) => {
    if (!query) return []
    try {
      const response = await net.fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`)
      if (!response.ok) return []
      return await response.json()
    } catch (err) {
      logger.error('Failed to fetch search suggestions:', err)
      return []
    }
  })

  ipcMain.handle('capture-tab', async (_event, webContentsId: number) => {
    try {
      if (typeof webContentsId !== 'number') return null
      const wc = webContents.fromId(webContentsId)
      if (!wc || wc.isDestroyed()) return null

      const img = await wc.capturePage()
      const jpeg = img.toJPEG(62)
      return `data:image/jpeg;base64,${jpeg.toString('base64')}`
    } catch (err) {
      return null
    }
  })

  // ── Performance diagnostics ─────────────────────────────────────────────
  ipcMain.handle('perf-get-snapshot', () => {
    return getLatestPerfSnapshot()
  })

  ipcMain.handle('perf-get-snapshots', (_event, limit?: number) => {
    const safeLimit = typeof limit === 'number' ? limit : 120
    return getPerfSnapshots(safeLimit)
  })

  ipcMain.handle('perf-start-monitor', (_event, intervalMs?: number) => {
    const safeInterval = typeof intervalMs === 'number' ? intervalMs : 10000
    return startPerfMonitor(safeInterval)
  })

  ipcMain.handle('perf-stop-monitor', () => {
    return stopPerfMonitor()
  })
}
