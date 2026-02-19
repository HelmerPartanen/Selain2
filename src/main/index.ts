// ─── App Entry Point ────────────────────────────────────────────────────────
// App lifecycle only. All subsystems live in their own modules.

import { app, BrowserWindow, components, session } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
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

  // ── Load bundled extensions into the webview session ────────────────────
  // Pass --no-extensions CLI flag to skip loading extensions for benchmarking
  const skipExtensions =
    process.argv.includes('--no-extensions') || process.env['BROWSER_SKIP_EXTENSIONS'] === '1'

  if (!skipExtensions) {
    const extensionsDir = app.isPackaged
      ? join(process.resourcesPath, 'uBlock0.chromium')
      : join(__dirname, '../../uBlock0.chromium')

    if (existsSync(extensionsDir)) {
      session
        .fromPartition('persist:default')
        .loadExtension(extensionsDir, { allowFileAccess: true })
        .then((ext) => {
          console.log(`[Extension] Loaded: ${ext.name} v${ext.version}`)
        })
        .catch((err) => {
          console.warn('[Extension] Failed to load uBlock Origin:', err)
        })
    } else {
      console.warn('[Extension] uBlock0.chromium directory not found at', extensionsDir)
    }
  } else {
    console.log('[Extension] Skipped loading extensions (--no-extensions flag)')
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
