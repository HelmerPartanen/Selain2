// ─── Main Process Shared State ───────────────────────────────────────────────
// Holds the mutable mainWindow reference used across all main-process modules.
// Using getter/setter functions ensures CJS-safe access (no stale destructuring).

import { BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}
