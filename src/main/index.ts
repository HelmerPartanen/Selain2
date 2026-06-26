// ─── App Entry Point ────────────────────────────────────────────────────────
// App lifecycle only. All subsystems live in their own modules.

import { app, BrowserWindow, session } from 'electron'
import { readFileSync, existsSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import './flags'                                     // side-effect: Chromium CLI switches
import { logger } from './logger'
import { createWindow } from './window'
import { setupIPC } from './ipc'
import { setupPermissions, setupCSP } from './permissions'
import { initBenchmarkPerfMonitor, writeBenchmarkPerfReport } from './perfMonitor'


app.whenReady().then(() => {
  setupIPC()
  setupPermissions()

  createWindow()

  // Run after the window has been created so it can't delay first paint.
  setupCSP()

  // Run perf-monitor init off the critical path. Under normal operation it
  // is a no-op; under BROWSER_PERF_BENCH=1 it starts sampling and registers
  // the perf IPC handlers (which also live in perfMonitor.ts).
  setImmediate(() => initBenchmarkPerfMonitor())

  // ── Load adblocker after first tick so window appears quickly ─────────────────
  // Pass --no-extensions CLI flag to skip loading extensions for benchmarking
  const skipExtensions =
    process.argv.includes('--no-extensions') || process.env['BROWSER_SKIP_EXTENSIONS'] === '1'
  const enableDomLevelBlocking =
    !process.argv.includes('--adblock-network-only') && process.env['BROWSER_ADBLOCK_DOM'] !== '0'

  let settingsAdblockerEnabled = true
  try {
    const settingsPath = join(app.getPath('userData'), 'browser-settings.json')
    if (existsSync(settingsPath)) {
      const data = readFileSync(settingsPath, 'utf-8')
      const parsed = JSON.parse(data)
      if (parsed?.state?.enableAdblocker === false) {
        settingsAdblockerEnabled = false
      }
    }
  } catch (err) {
    logger.warn('[main] Failed to read browser settings for adblocker init:', err)
  }

  const skipAdblocker =
    !settingsAdblockerEnabled ||
    skipExtensions ||
    process.argv.includes('--no-adblock') ||
    process.env['BROWSER_DISABLE_ADBLOCK'] === '1'

  const loadAdblocker = async (): Promise<void> => {
    if (skipAdblocker) {
      logger.log(
        '[Adblocker] Skipped (--no-extensions, --no-adblock, or BROWSER_DISABLE_ADBLOCK=1)'
      )
      return
    }
    const [{ ElectronBlocker }, { adsAndTrackingLists }] = await Promise.all([
      import('@ghostery/adblocker-electron'),
      import('@ghostery/adblocker')
    ])
    const adblockConfig = {
      loadNetworkFilters: true,
      loadCosmeticFilters: enableDomLevelBlocking,
      loadGenericCosmeticsFilters: enableDomLevelBlocking,
      loadExtendedSelectors: enableDomLevelBlocking,
      enableMutationObserver: enableDomLevelBlocking,
    }
    // Exception rules so streaming/DRM sites (e.g. Netflix) are not blocked — avoids M7121-1331.
    // Use $document to disable all blocking (network + cosmetic) on these pages.
    const streamingAllowlist = [
      '@@||netflix.com^$document',
      '@@||netflix.net^$document',
      '@@||nflxvideo.net^',
      '@@||nflxext.com^',
      '@@||nflxso.net^',
      '@@||nflxstatic.com^',
      '@@||spotify.com^$document',
      '@@||scdn.co^',
    ].join('\n')
    const cachePath = join(
      app.getPath('userData'),
      enableDomLevelBlocking ? 'adblock-engine-dom.bin' : 'adblock-engine-network.bin'
    )
    ElectronBlocker.fromLists(globalThis.fetch, adsAndTrackingLists, adblockConfig, {
      path: cachePath,
      read: readFile,
      write: writeFile
    })
      .then((blocker) => {
        const allowlistEngine = ElectronBlocker.parse(streamingAllowlist, { loadNetworkFilters: true })
        const merged = ElectronBlocker.merge([blocker, allowlistEngine]) as typeof blocker
        const ses = session.fromPartition('persist:default')
        merged.enableBlockingInSession(ses)
        const mode = enableDomLevelBlocking ? 'network + DOM filters' : 'network filters only'
        logger.log(`[Adblocker] Loaded Ghostery adblocker (${mode})`)
      })
      .catch((err) => {
        logger.warn('[Adblocker] Failed to load Ghostery adblocker:', err)
      })
  }
  setImmediate(() => {
    void loadAdblocker().catch((err) => {
      logger.warn('[Adblocker] Failed to initialize:', err)
    })
  })

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

app.on('will-quit', () => {
  const report = writeBenchmarkPerfReport()
  if (report) {
    logger.log('[perf] Benchmark report written:', report)
  }
})

// Global error handlers so one failure does not kill the app unexpectedly.
process.on('uncaughtException', (err) => {
  logger.error('[main] uncaughtException:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[main] unhandledRejection:', reason, promise)
})
