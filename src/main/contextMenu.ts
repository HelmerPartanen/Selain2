// ─── Context Menu Builder ─────────────────────────────────────────────────────
// Builds a native right-click context menu for webview content.
// Handles links, images, media, editable fields, selections, and page actions.

import { clipboard, dialog, Menu } from 'electron'
import { getMainWindow } from './state'

export function buildContextMenu(
  webContents: Electron.WebContents,
  params: Electron.ContextMenuParams
): Electron.Menu {
  const template: Electron.MenuItemConstructorOptions[] = []
  const { editFlags } = params

  // ── Link context ──
  if (params.linkURL) {
    template.push(
      {
        label: 'Open Link in New Tab',
        click: () => getMainWindow()?.webContents.send('open-url-in-new-tab', params.linkURL)
      },
      { type: 'separator' },
      {
        label: 'Copy Link Address',
        click: () => clipboard.writeText(params.linkURL)
      },
      {
        label: 'Save Link As\u2026',
        click: () => webContents.downloadURL(params.linkURL)
      },
      { type: 'separator' }
    )
  }

  // ── Image context ──
  if (params.hasImageContents && params.srcURL) {
    template.push(
      {
        label: 'Open Image in New Tab',
        click: () => getMainWindow()?.webContents.send('open-url-in-new-tab', params.srcURL)
      },
      {
        label: 'Save Image As\u2026',
        click: () => webContents.downloadURL(params.srcURL)
      },
      {
        label: 'Copy Image',
        click: () => webContents.copyImageAt(params.x, params.y)
      },
      {
        label: 'Copy Image Address',
        click: () => clipboard.writeText(params.srcURL)
      },
      { type: 'separator' }
    )
  }

  // ── Audio / Video context ──
  if (params.mediaType === 'audio' || params.mediaType === 'video') {
    template.push(
      {
        label: params.mediaFlags.isPaused ? 'Play' : 'Pause',
        click: () => webContents.executeJavaScript(
          `document.elementFromPoint(${params.x},${params.y})?.${params.mediaFlags.isPaused ? 'play()' : 'pause()'}`
        )
      },
      {
        label: params.mediaFlags.isMuted ? 'Unmute' : 'Mute',
        click: () => webContents.executeJavaScript(
          `{const m=document.elementFromPoint(${params.x},${params.y});if(m)m.muted=${!params.mediaFlags.isMuted}}`
        )
      },
      {
        label: 'Loop',
        type: 'checkbox',
        checked: params.mediaFlags.isLooping,
        click: () => webContents.executeJavaScript(
          `{const m=document.elementFromPoint(${params.x},${params.y});if(m)m.loop=${!params.mediaFlags.isLooping}}`
        )
      },
      {
        label: 'Show Controls',
        type: 'checkbox',
        checked: params.mediaFlags.isControlsVisible,
        click: () => webContents.executeJavaScript(
          `{const m=document.elementFromPoint(${params.x},${params.y});if(m)m.controls=${!params.mediaFlags.isControlsVisible}}`
        )
      },
      { type: 'separator' },
      {
        label: 'Copy Media Address',
        click: () => clipboard.writeText(params.srcURL)
      },
      {
        label: 'Open Media in New Tab',
        click: () => getMainWindow()?.webContents.send('open-url-in-new-tab', params.srcURL)
      },
      { type: 'separator' }
    )
  }

  // ── Editable field context ──
  if (params.isEditable) {
    template.push(
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', enabled: editFlags.canUndo, click: () => webContents.undo() },
      { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', enabled: editFlags.canRedo, click: () => webContents.redo() },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', enabled: editFlags.canCut, click: () => webContents.cut() },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', enabled: editFlags.canCopy, click: () => webContents.copy() },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', enabled: editFlags.canPaste, click: () => webContents.paste() },
      { label: 'Delete', enabled: editFlags.canDelete, click: () => webContents.delete() },
      { type: 'separator' },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A', enabled: editFlags.canSelectAll, click: () => webContents.selectAll() }
    )
  } else if (params.selectionText) {
    // ── Selection context (non-editable) ──
    template.push(
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => webContents.copy() }
    )

    const trimmed = params.selectionText.trim()
    if (trimmed.length > 0) {
      const display = trimmed.length > 30 ? trimmed.slice(0, 30) + '\u2026' : trimmed
      template.push({
        label: `Search Google for \u201C${display}\u201D`,
        click: () => {
          const query = encodeURIComponent(trimmed)
          getMainWindow()?.webContents.send('open-url-in-new-tab', `https://www.google.com/search?q=${query}`)
        }
      })
    }
    template.push({ type: 'separator' })
  }

  // ── Navigation ──
  template.push(
    { label: 'Back', accelerator: 'Alt+Left', enabled: webContents.canGoBack(), click: () => webContents.goBack() },
    { label: 'Forward', accelerator: 'Alt+Right', enabled: webContents.canGoForward(), click: () => webContents.goForward() },
    { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => webContents.reload() },
    { type: 'separator' }
  )

  // ── Page actions ──
  template.push(
    {
      label: 'Save Page As\u2026',
      accelerator: 'CmdOrCtrl+S',
      click: async () => {
        const win = getMainWindow()
        if (!win) return
        const result = await dialog.showSaveDialog(win, {
          defaultPath: (webContents.getTitle() || 'page').replace(/[/\\?%*:|"<>]/g, '_') + '.html',
          filters: [
            { name: 'HTML', extensions: ['html', 'htm'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        })
        if (!result.canceled && result.filePath) {
          webContents.savePage(result.filePath, 'HTMLComplete')
        }
      }
    },
    {
      label: 'Print\u2026',
      accelerator: 'CmdOrCtrl+P',
      click: () => webContents.print()
    },
    { type: 'separator' }
  )

  // ── Developer ──
  template.push(
    {
      label: 'View Page Source',
      click: () => {
        const url = webContents.getURL()
        if (url) getMainWindow()?.webContents.send('open-url-in-new-tab', `view-source:${url}`)
      }
    },
    {
      label: 'Inspect Element',
      click: () => {
        if (!webContents.isDevToolsOpened()) {
          webContents.openDevTools({ mode: 'detach' })
        }
        webContents.inspectElement(params.x, params.y)
      }
    }
  )

  return Menu.buildFromTemplate(template)
}
