// ─── IPC Handlers ─────────────────────────────────────────────────────────────
// All ipcMain handlers: downloads, window controls, zoom, image picker,
// wallpaper persistence, and settings store persistence.

import {
  app,
  dialog,
  ipcMain,
  nativeImage,
  session,
  shell,
  webContents,
  net,
} from 'electron'
import { mkdir, readFile, rename, writeFile, unlink } from 'fs/promises'
import { basename, isAbsolute, join, relative, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { existsSync, writeFileSync } from 'fs'
import { logger } from './logger'
import { getMainWindow, isTrackedAppWebview, isTrustedAppSender } from './state'
import {
  getLatestPerfSnapshot,
  getPerfSnapshots,
  startPerfMonitor,
  stopPerfMonitor,
} from './perfMonitor'
import { setupAIIPC } from './ai/ipcAI'

const PERF_LOGS = process.env['BROWSER_PERF_LOG'] === '1'
const MAX_WALLPAPER_DATA_URL_BYTES = 10 * 1024 * 1024
const MAX_STORE_BYTES = 5 * 1024 * 1024
const MAX_EXPORT_BYTES = 10 * 1024 * 1024

const storePerf = {
  saveRequests: 0,
  written: 0,
  skippedNoChange: 0,
  loadHits: 0,
  loadMisses: 0,
  saveErrors: 0,
}

const savedStoreCache = new Map<string, string>()

interface CustomWallpaper {
  id: string
  name: string
  url: string
  createdAt: number
}

function startPerfLogging(): void {
  if (!PERF_LOGS) return
  setInterval(() => {
    logger.log('[perf][main][store]', {
      ...storePerf,
      cachedStores: savedStoreCache.size,
    })
  }, 10000)
}

function sendToMainWindow(channel: string, payload: unknown): void {
  const win = getMainWindow()
  if (!win || win.isDestroyed()) return
  if (win.webContents.isDestroyed()) return
  win.webContents.send(channel, payload)
}

function originFromUrl(input: string): string | null {
  try {
    const url = new URL(input)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

function isFromAppShell(
  event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent,
): boolean {
  return isTrustedAppSender(event.sender)
}

function stringByteLength(value: string): number {
  return Buffer.byteLength(value, 'utf-8')
}

function isPathInside(parent: string, child: string): boolean {
  const parentPath = resolve(parent)
  const childPath = resolve(child)
  const rel = relative(parentPath, childPath)
  return rel === '' || (!!rel && !rel.startsWith('..') && !isAbsolute(rel))
}

export function setupIPC(): void {
  startPerfLogging()
  setupAIIPC()

  // ── Download management ──────────────────────────────────────────────────
  const activeDownloads = new Map<string, Electron.DownloadItem>()
  const knownDownloadPaths = new Map<string, string>()
  let downloadCounter = 0

  function setupDownloadHandling(
    ses: Electron.Session,
    isPrivate = false,
  ): void {
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
        startTime: Date.now(),
        isPrivate,
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
            speed: item.getCurrentBytesPerSecond?.() ?? 0,
          })
        } else if (state === 'interrupted') {
          sendToMainWindow('download-progress', {
            id,
            receivedBytes: item.getReceivedBytes(),
            totalBytes: item.getTotalBytes(),
            speed: 0,
          })
        }
      })

      item.once('done', (_event, state) => {
        const finalPath = item.getSavePath()
        if (finalPath) knownDownloadPaths.set(id, finalPath)
        sendToMainWindow('download-done', {
          id,
          state:
            state === 'completed'
              ? 'completed'
              : state === 'cancelled'
                ? 'cancelled'
                : 'failed',
        })
        activeDownloads.delete(id)
        // Prune path after a delay so open/show-in-folder still works briefly after done
        setTimeout(() => knownDownloadPaths.delete(id), 60000)
      })
    })
  }

  setupDownloadHandling(session.defaultSession)
  setupDownloadHandling(session.fromPartition('persist:default'))
  setupDownloadHandling(session.fromPartition('private'), true)

  const VALID_DOWNLOAD_ACTIONS = new Set([
    'pause',
    'resume',
    'cancel',
    'open',
    'show-in-folder',
  ])

  ipcMain.on(
    'download-action',
    (event, action: string, id: string, _savePath?: string) => {
      if (!isFromAppShell(event)) return
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
        case 'pause':
          item.pause()
          break
        case 'resume':
          item.resume()
          break
        case 'cancel':
          item.cancel()
          break
      }
    },
  )

  // ── Window controls ──────────────────────────────────────────────────────
  ipcMain.on('window-minimize', (event) => {
    if (isFromAppShell(event)) getMainWindow()?.minimize()
  })
  ipcMain.on('window-maximize', (event) => {
    if (isFromAppShell(event)) getMainWindow()?.maximize()
  })
  ipcMain.on('window-close', (event) => {
    if (isFromAppShell(event)) getMainWindow()?.close()
  })
  ipcMain.on('window-toggle-maximize', (event) => {
    if (!isFromAppShell(event)) return
    const win = getMainWindow()
    if (!win) return
    win.isMaximized() ? win.unmaximize() : win.maximize()
  })

  ipcMain.on('set-zoom-factor', (event, factor: number) => {
    if (!isFromAppShell(event)) return
    if (typeof factor !== 'number' || !Number.isFinite(factor)) return
    const clamped = Math.max(0.25, Math.min(5, factor))
    getMainWindow()?.webContents.setZoomFactor(clamped)
  })

  ipcMain.handle('open-external', async (event, url: unknown) => {
    if (!isFromAppShell(event)) return false
    if (typeof url !== 'string') return false
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
        return false
      await shell.openExternal(parsed.toString())
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('get-site-info', async (event, url: unknown) => {
    if (!isFromAppShell(event)) return null
    if (typeof url !== 'string') return null
    const origin = originFromUrl(url)
    if (!origin) return null
    const ses = session.fromPartition('persist:default')
    try {
      const parsed = new URL(origin)
      const cookies = await ses.cookies.get({ url: origin })
      const cacheSize = await ses.getCacheSize()
      return {
        origin,
        hostname: parsed.hostname,
        isSecure: parsed.protocol === 'https:',
        cookieCount: cookies.length,
        cacheSize,
        adblockerEnabled: true,
      }
    } catch (err) {
      logger.warn('Failed to get site info:', err)
      return null
    }
  })

  // Shared helper: wipes all storage + cookies for a given origin.
  async function clearSiteData(safeOrigin: string): Promise<boolean> {
    const ses = session.fromPartition('persist:default')
    try {
      await ses.clearStorageData({ origin: safeOrigin })
      const cookies = await ses.cookies.get({ url: safeOrigin })
      await Promise.all(
        cookies.map((cookie) => ses.cookies.remove(safeOrigin, cookie.name)),
      )
      return true
    } catch (err) {
      logger.warn('Failed to clear site data:', err)
      return false
    }
  }

  ipcMain.handle('clear-site-data', async (event, origin: unknown) => {
    if (!isFromAppShell(event)) return false
    if (typeof origin !== 'string') return false
    const safeOrigin = originFromUrl(origin)
    if (!safeOrigin) return false
    return clearSiteData(safeOrigin)
  })

  // forget-site performs a full site data wipe (same semantics as clear-site-data).
  ipcMain.handle('forget-site', async (event, origin: unknown) => {
    if (!isFromAppShell(event)) return false
    if (typeof origin !== 'string') return false
    const safeOrigin = originFromUrl(origin)
    if (!safeOrigin) return false
    return clearSiteData(safeOrigin)
  })

  // ── Wallpaper persistence ────────────────────────────────────────────────
  const wallpaperPath = join(app.getPath('userData'), 'wallpaper.dat')
  const wallpaperDir = join(app.getPath('userData'), 'wallpapers')
  const customWallpaperIndexPath = join(wallpaperDir, 'custom-wallpapers.json')

  function isAllowedWallpaperValue(value: string): boolean {
    if (stringByteLength(value) > MAX_WALLPAPER_DATA_URL_BYTES) return false
    if (
      /^color:#[0-9a-f]{6}$/i.test(value) ||
      value.startsWith('bundled:') ||
      value.startsWith('preset:') ||
      value.startsWith('dynamic:')
    ) {
      return true
    }
    if (/^data:image\/(?:png|jpe?g|webp|bmp|gif);base64,/i.test(value))
      return true
    if (value.startsWith('file://')) {
      try {
        return isPathInside(wallpaperDir, fileURLToPath(value))
      } catch {
        return false
      }
    }
    return value.length === 0
  }

  async function writeTextAtomic(
    filePath: string,
    data: string,
  ): Promise<void> {
    const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`
    await writeFile(tempPath, data, 'utf-8')
    await rename(tempPath, filePath)
  }

  async function loadCustomWallpapers(): Promise<CustomWallpaper[]> {
    try {
      if (!existsSync(customWallpaperIndexPath)) return []
      const parsed = JSON.parse(
        await readFile(customWallpaperIndexPath, 'utf-8'),
      ) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed.filter((item): item is CustomWallpaper => {
        const candidate = item as Partial<CustomWallpaper>
        if (
          typeof candidate.id === 'string' &&
          typeof candidate.name === 'string' &&
          typeof candidate.url === 'string' &&
          typeof candidate.createdAt === 'number'
        ) {
          try {
            return existsSync(fileURLToPath(candidate.url))
          } catch {
            return false
          }
        }
        return false
      })
    } catch (err) {
      logger.warn('Failed to load custom wallpaper index:', err)
      return []
    }
  }

  async function saveCustomWallpapers(items: CustomWallpaper[]): Promise<void> {
    await mkdir(wallpaperDir, { recursive: true })
    await writeTextAtomic(
      customWallpaperIndexPath,
      JSON.stringify(items, null, 2),
    )
  }

  async function saveSelectedWallpaper(value: string | null): Promise<boolean> {
    try {
      if (value === null) {
        if (existsSync(wallpaperPath)) await unlink(wallpaperPath)
        return true
      }

      if (typeof value !== 'string' || !isAllowedWallpaperValue(value)) {
        logger.warn('Invalid wallpaper data')
        return false
      }

      await writeTextAtomic(wallpaperPath, value)
      return true
    } catch (err) {
      logger.warn('Failed to save wallpaper:', err)
      return false
    }
  }

  async function importWallpaperFromDialog(): Promise<CustomWallpaper | null> {
    const win = getMainWindow()
    if (!win) return null

    const result = await dialog.showOpenDialog(win, {
      title: 'Choose a wallpaper image',
      filters: [
        {
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'],
        },
      ],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]!
    const buffer = await readFile(filePath)

    // Resize to a sensible display size to keep startup and CSS painting fast.
    let img = nativeImage.createFromBuffer(buffer)
    const size = img.getSize()
    if (img.isEmpty() || size.width <= 0 || size.height <= 0) {
      logger.warn('Selected wallpaper could not be decoded')
      return null
    }

    const MAX_EDGE = 2560
    const longest = Math.max(size.width, size.height)
    if (longest > MAX_EDGE) {
      const ratio = MAX_EDGE / longest
      img = img.resize({
        width: Math.round(size.width * ratio),
        height: Math.round(size.height * ratio),
        quality: 'good',
      })
    }

    await mkdir(wallpaperDir, { recursive: true })
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const outputPath = join(wallpaperDir, `${id}.jpg`)
    const tempPath = `${outputPath}.tmp`
    await writeFile(tempPath, img.toJPEG(88))
    await rename(tempPath, outputPath)

    const item: CustomWallpaper = {
      id,
      name: basename(filePath).replace(/\.[^.]+$/, ''),
      url: pathToFileURL(outputPath).toString(),
      createdAt: Date.now(),
    }

    const existing = await loadCustomWallpapers()
    await saveCustomWallpapers([item, ...existing])
    await saveSelectedWallpaper(item.url)
    return item
  }

  // Legacy API: keep returning just the URL for older renderer call sites.
  ipcMain.handle('open-image-dialog', async (event) => {
    if (!isFromAppShell(event)) return null
    const item = await importWallpaperFromDialog()
    return item?.url ?? null
  })

  ipcMain.handle('import-wallpaper', async (event) => {
    if (!isFromAppShell(event)) return null
    return importWallpaperFromDialog()
  })

  ipcMain.handle('list-custom-wallpapers', async (event) => {
    if (!isFromAppShell(event)) return []
    return loadCustomWallpapers()
  })

  ipcMain.handle('delete-custom-wallpaper', async (event, id: unknown) => {
    if (!isFromAppShell(event)) return false
    if (typeof id !== 'string' || !id.startsWith('custom-')) return false
    const existing = await loadCustomWallpapers()
    const item = existing.find((wp) => wp.id === id)
    if (!item) return false

    await saveCustomWallpapers(existing.filter((wp) => wp.id !== id))
    const filePath = join(wallpaperDir, `${id}.jpg`)
    try {
      if (existsSync(filePath)) await unlink(filePath)
    } catch (err) {
      logger.warn('Failed to delete custom wallpaper file:', err)
    }
    return true
  })

  ipcMain.handle('save-wallpaper', async (event, dataUrl: string | null) => {
    if (!isFromAppShell(event)) return false
    return saveSelectedWallpaper(dataUrl)
  })

  ipcMain.handle('load-wallpaper', async (event) => {
    if (!isFromAppShell(event)) return null
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
    'space-store',
    'site-permissions',
    'shortcut-store',
  ])
  const storeDir = app.getPath('userData')

  ipcMain.on('clear-stores-sync', (event, names: unknown) => {
    if (!isFromAppShell(event)) {
      event.returnValue = false
      return
    }
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

  ipcMain.handle('load-store', async (event, name: string) => {
    if (!isFromAppShell(event)) return null
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

  ipcMain.handle('save-store', async (event, name: string, data: string) => {
    if (!isFromAppShell(event)) return false
    if (typeof name !== 'string' || !ALLOWED_STORES.has(name)) return false
    if (typeof data !== 'string') return false
    if (stringByteLength(data) > MAX_STORE_BYTES) return false
    try {
      JSON.parse(data)
    } catch {
      return false
    }
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

  ipcMain.handle('export-bookmarks-html', async (event, html: unknown) => {
    if (!isFromAppShell(event)) return false
    if (typeof html !== 'string') return false
    if (stringByteLength(html) > MAX_EXPORT_BYTES) return false
    const win = getMainWindow()
    if (!win) return false
    const result = await dialog.showSaveDialog(win, {
      title: 'Export bookmarks',
      defaultPath: 'bookmarks.html',
      filters: [{ name: 'HTML', extensions: ['html'] }],
    })
    if (result.canceled || !result.filePath) return false
    await writeFile(result.filePath, html, 'utf-8')
    return true
  })

  ipcMain.handle('import-bookmarks-html', async (event) => {
    if (!isFromAppShell(event)) return null
    const win = getMainWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      title: 'Import bookmarks',
      filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const data = await readFile(result.filePaths[0]!, 'utf-8')
    return stringByteLength(data) <= MAX_EXPORT_BYTES ? data : null
  })

  ipcMain.handle('export-profile-backup', async (event, data: unknown) => {
    if (!isFromAppShell(event)) return false
    if (typeof data !== 'string') return false
    if (stringByteLength(data) > MAX_EXPORT_BYTES) return false
    try {
      JSON.parse(data)
    } catch {
      return false
    }
    const win = getMainWindow()
    if (!win) return false
    const result = await dialog.showSaveDialog(win, {
      title: 'Export browser profile',
      defaultPath: 'browser-profile-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return false
    await writeFile(result.filePath, data, 'utf-8')
    return true
  })

  ipcMain.handle('import-profile-backup', async (event) => {
    if (!isFromAppShell(event)) return null
    const win = getMainWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      title: 'Import browser profile',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const data = await readFile(result.filePaths[0]!, 'utf-8')
    if (stringByteLength(data) > MAX_EXPORT_BYTES) return null
    try {
      JSON.parse(data)
    } catch {
      return null
    }
    return data
  })

  // ── Picture-in-Picture ──────────────────────────────────────────────────
  ipcMain.on('request-pip', (event, webContentsId: number) => {
    if (!isFromAppShell(event)) return
    if (
      typeof webContentsId !== 'number' ||
      !isTrackedAppWebview(webContentsId)
    )
      return
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
  ipcMain.handle('fetch-search-suggestions', async (event, query: string) => {
    if (!isFromAppShell(event)) return []
    if (typeof query !== 'string' || query.length > 256) return []
    if (!query) return []
    try {
      const response = await net.fetch(
        `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`,
      )
      if (!response.ok) return []
      return await response.json()
    } catch (err) {
      logger.error('Failed to fetch search suggestions:', err)
      return []
    }
  })

  ipcMain.handle('capture-tab', async (event, webContentsId: number) => {
    try {
      if (!isFromAppShell(event)) return null
      if (typeof webContentsId !== 'number') return null
      if (!isTrackedAppWebview(webContentsId)) return null
      const wc = webContents.fromId(webContentsId)
      if (!wc || wc.isDestroyed()) return null

      const img = await wc.capturePage()
      const size = img.getSize()
      const MAX_WIDTH = 400
      const toEncode =
        size.width > MAX_WIDTH
          ? img.resize({
              width: MAX_WIDTH,
              height: Math.round((size.height * MAX_WIDTH) / size.width),
              quality: 'good',
            })
          : img
      const jpeg = toEncode.toJPEG(52)
      return `data:image/jpeg;base64,${jpeg.toString('base64')}`
    } catch (err) {
      return null
    }
  })

  ipcMain.handle('destroy-webview', async (event, webContentsId: number) => {
    try {
      if (!isFromAppShell(event)) return false
      if (typeof webContentsId !== 'number') return false
      if (!isTrackedAppWebview(webContentsId)) return false

      const wc = webContents.fromId(webContentsId)
      if (!wc || wc.isDestroyed()) return true

      try {
        wc.stop()
      } catch {
        // Best-effort cleanup; still close the guest below.
      }

      try {
        wc.navigationHistory.clear()
      } catch {
        try {
          wc.clearHistory()
        } catch {
          // History cleanup is opportunistic.
        }
      }

      wc.close({ waitForBeforeUnload: false })
      return true
    } catch (err) {
      logger.warn('Failed to destroy webview:', err)
      return false
    }
  })

  // ── Performance diagnostics ─────────────────────────────────────────────
  // Only registered when BROWSER_PERF_BENCH=1. The renderer checks the same
  // flag and skips calling these handlers under normal operation.
  if (process.env['BROWSER_PERF_BENCH'] === '1') {
    ipcMain.handle('perf-get-snapshot', (event) => {
      if (!isFromAppShell(event)) return null
      return getLatestPerfSnapshot()
    })

    ipcMain.handle('perf-get-snapshots', (event, limit?: number) => {
      if (!isFromAppShell(event)) return []
      const safeLimit = typeof limit === 'number' ? limit : 120
      return getPerfSnapshots(safeLimit)
    })

    ipcMain.handle('perf-start-monitor', (event, intervalMs?: number) => {
      if (!isFromAppShell(event)) return { started: false, intervalMs: 0 }
      const safeInterval = typeof intervalMs === 'number' ? intervalMs : 10000
      return startPerfMonitor(safeInterval)
    })

    ipcMain.handle('perf-stop-monitor', (event) => {
      if (!isFromAppShell(event)) return { stopped: false, samples: 0 }
      return stopPerfMonitor()
    })
  }
}
