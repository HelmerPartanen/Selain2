// ─── Chromium CLI Flags ───────────────────────────────────────────────────────
// Must be set before app.ready. Import this module for its side effects only.

import { app, Menu } from 'electron'

// ── GPU & Rendering Performance ──
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('disable-software-rasterizer')

// NOTE: Background throttling is intentionally re-enabled (defaults).
// Hidden/suspended webviews should be throttled to save CPU/RAM.
// The LRU tab manager handles tab suspension separately.

// ── V8 & Blink Performance ──
app.commandLine.appendSwitch('enable-features',
  'V8VmFuture,BackForwardCache,BlinkSchedulerHighPriorityInput,CanvasOopRasterization,UseSkiaRenderer'
)
app.commandLine.appendSwitch('js-flags',
  '--maglev --turbofan'
)
app.commandLine.appendSwitch('renderer-process-limit', '8')
app.commandLine.appendSwitch('enable-quic')

// ── Privacy: disable telemetry, translation, crash reporting ──
app.commandLine.appendSwitch('disable-breakpad')
// Note: component-update is needed for Widevine CDM installation via castlabs ECS
app.commandLine.appendSwitch('disable-domain-reliability')
app.commandLine.appendSwitch('disable-features',
  'AutofillServerCommunication,TranslateUI,SpareRendererForSitePerProcess'
)

// Allow autoplay for media (Spotify, YouTube, etc.)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// Suppress the default application menu
Menu.setApplicationMenu(null)
