// ─── Shortcut Forwarding ──────────────────────────────────────────────────────
// Intercepts keyboard shortcuts from both the host webContents and all
// attached webviews, forwarding matching combos to the renderer via IPC.
// Required because webview focus absorbs keydown events before they reach React.

import { getMainWindow } from './state'

const CTRL_KEYS = new Set(['t', 'w', 'l', 'f', 'r', 'h', 'b', ',', 'd', 'm'])
const CTRL_SHIFT_KEYS = new Set(['t', 's', 'a', 'x', 'z'])
const ALT_KEYS = new Set(['arrowleft', 'arrowright'])
const DIGIT_RE = /^[1-9]$/

export function handleShortcutInput(
  event: Electron.Event,
  input: Electron.Input
): void {
  if (input.type !== 'keyDown') return

  const win = getMainWindow()
  if (!win) return

  const ctrl = input.control || input.meta
  const shift = input.shift
  const alt = input.alt
  const key = input.key.toLowerCase()

  const isShortcut =
    (ctrl && !shift && CTRL_KEYS.has(key)) ||
    (ctrl && shift && CTRL_SHIFT_KEYS.has(key)) ||
    (ctrl && key === 'tab') ||
    (ctrl && !shift && DIGIT_RE.test(input.key)) ||
    (!ctrl && key === 'f5') ||
    (alt && !ctrl && ALT_KEYS.has(key)) ||
    (key === 'escape')

  if (isShortcut) {
    event.preventDefault()
    win.webContents.send('shortcut-pressed', {
      key: input.key,
      code: input.code,
      ctrlKey: input.control,
      metaKey: input.meta,
      shiftKey: input.shift,
      altKey: input.alt
    })
  }
}
