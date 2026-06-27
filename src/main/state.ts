// ─── Main Process Shared State ───────────────────────────────────────────────
// Holds the mutable mainWindow reference used across all main-process modules.
// Using getter/setter functions ensures CJS-safe access (no stale destructuring).

import { BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null
const attachedWebviewIds = new Set<number>()

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
  if (!win) attachedWebviewIds.clear()
}

export function isTrustedAppSender(sender: Electron.WebContents): boolean {
  return Boolean(
    mainWindow &&
    !mainWindow.isDestroyed() &&
    sender.id === mainWindow.webContents.id,
  )
}

export function trackAttachedWebview(webContents: Electron.WebContents): void {
  attachedWebviewIds.add(webContents.id)
  webContents.once('destroyed', () => {
    attachedWebviewIds.delete(webContents.id)
  })
}

export function isTrackedAppWebview(webContentsId: number): boolean {
  return attachedWebviewIds.has(webContentsId)
}
