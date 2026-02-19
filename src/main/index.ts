// ─── App Entry Point ────────────────────────────────────────────────────────
// App lifecycle only. All subsystems live in their own modules.

import { app, BrowserWindow, components, session } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { ElectronBlocker } from '@cliqz/adblocker-electron'
import fetch from 'cross-fetch'
import './flags'                                     // side-effect: Chromium CLI switches
import { createWindow } from './window'
import { setupIPC } from './ipc'
import { setupPermissions, setupCSP } from './permissions'
import { initBenchmarkPerfMonitor, writeBenchmarkPerfReport } from './perfMonitor'

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
  initBenchmarkPerfMonitor()

  createWindow()

  // ── Load adblocker into the webview session ────────────────────
  // Pass --no-extensions CLI flag to skip loading extensions for benchmarking
  const skipExtensions =
    process.argv.includes('--no-extensions') || process.env['BROWSER_SKIP_EXTENSIONS'] === '1'

  if (!skipExtensions) {
    ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
      const ses = session.fromPartition('persist:default')
      // Disable preload script injection to avoid registerPreloadScript error in newer Electron versions
      blocker.enableBlockingInSession(ses)
      console.log('[Adblocker] Loaded Ghostery adblocker')
    }).catch((err) => {
      console.warn('[Adblocker] Failed to load Ghostery adblocker:', err)
    })
  } else {
    console.log('[Adblocker] Skipped loading adblocker (--no-extensions flag)')
  }

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

app.on('will-quit', () => {
  const report = writeBenchmarkPerfReport()
  if (report) {
    console.log('[perf] Benchmark report written:', report)
  }
})
