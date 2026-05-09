import { useEffect } from 'react'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { webviewRegistry } from '@/webview/webviewRegistry'

function getFocusedTabId(): string | null {
  const s = useTabStore.getState()
  if (s.focusedPanel === 'split' && s.splitTabId) return s.splitTabId
  return s.activeTabId
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    // Listen for shortcuts forwarded from main process (when webview has focus)
    const unsubIPC = window.electronAPI.onShortcutPressed((shortcut) => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: shortcut.key,
        code: shortcut.code,
        ctrlKey: shortcut.ctrlKey,
        metaKey: shortcut.metaKey,
        shiftKey: shortcut.shiftKey,
        altKey: shortcut.altKey,
        bubbles: true,
        cancelable: true
      }))
    })

    function handleKeyDown(e: KeyboardEvent): void {
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey
      const key = e.key.toLowerCase()

      // Ignore when typing in input fields (except our shortcuts)
      const target = e.target as HTMLElement
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Ctrl+T — New tab
      if (ctrl && !shift && key === 't') {
        e.preventDefault()
        useTabStore.getState().addTab()
        return
      }

      // Ctrl+W — Close current tab
      if (ctrl && !shift && key === 'w') {
        e.preventDefault()
        const tabId = getFocusedTabId()
        if (tabId) useTabStore.getState().removeTab(tabId)
        return
      }

      // Ctrl+Shift+T — Reopen last closed tab
      if (ctrl && shift && key === 't') {
        e.preventDefault()
        useTabStore.getState().reopenLastClosed()
        return
      }

      // Ctrl+Shift+A — Toggle tab overview
      if (ctrl && shift && key === 'a') {
        e.preventDefault()
        useUIStore.getState().toggleTabOverview()
        return
      }

      // Ctrl+L — Focus URL bar
      if (ctrl && !shift && key === 'l') {
        e.preventDefault()
        useUIStore.getState().requestUrlBarFocus()
        return
      }

      // Ctrl+F — Toggle find bar
      if (ctrl && !shift && key === 'f') {
        e.preventDefault()
        useUIStore.getState().toggleFindBar()
        return
      }

      // Escape — Close find bar (when not in input)
      if (key === 'escape' && !isInputField) {
        const ui = useUIStore.getState()
        if (ui.isFindBarOpen) {
          ui.closeFindBar()
          return
        }
      }

      // Ctrl+Shift+S — Toggle split view (split next tab or unsplit)
      if (ctrl && shift && key === 's') {
        e.preventDefault()
        const state = useTabStore.getState()
        if (state.splitTabId) {
          state.unsplit()
        } else if (state.tabOrder.length > 1 && state.activeTabId) {
          // Find next tab to split
          const currentIdx = state.tabOrder.indexOf(state.activeTabId)
          const nextIdx = (currentIdx + 1) % state.tabOrder.length
          const nextId = state.tabOrder[nextIdx]
          if (nextId && nextId !== state.activeTabId) {
            state.splitTab(nextId)
          }
        }
        return
      }

      // Ctrl+Shift+X — Swap split panels
      if (ctrl && shift && key === 'x') {
        e.preventDefault()
        const state = useTabStore.getState()
        if (state.splitTabId) {
          state.swapSplitPanels()
        }
        return
      }

      // Ctrl+Tab / Ctrl+Shift+Tab — Cycle tabs
      if (ctrl && key === 'tab') {
        e.preventDefault()
        const state = useTabStore.getState()
        if (state.tabOrder.length <= 1 || !state.activeTabId) return
        const currentIdx = state.tabOrder.indexOf(state.activeTabId)
        let nextIdx: number
        if (shift) {
          nextIdx = currentIdx <= 0 ? state.tabOrder.length - 1 : currentIdx - 1
        } else {
          nextIdx = (currentIdx + 1) % state.tabOrder.length
        }
        const nextId = state.tabOrder[nextIdx]
        if (nextId) state.setActiveTab(nextId)
        return
      }

      // Ctrl+1 through Ctrl+9 — Switch to tab N
      if (ctrl && !shift && /^[1-9]$/.test(e.key)) {
        e.preventDefault()
        const idx = parseInt(e.key) - 1
        const state = useTabStore.getState()
        if (e.key === '9') {
          // Ctrl+9 always goes to last tab
          const lastId = state.tabOrder[state.tabOrder.length - 1]
          if (lastId) state.setActiveTab(lastId)
        } else {
          const targetId = state.tabOrder[idx]
          if (targetId) state.setActiveTab(targetId)
        }
        return
      }

      // Ctrl+R or F5 — Reload
      if ((ctrl && !shift && key === 'r') || (!ctrl && key === 'f5')) {
        e.preventDefault()
        const tabId = getFocusedTabId()
        if (tabId) webviewRegistry.get(tabId)?.reload()
        return
      }

      // Alt+Left — Go back
      if (e.altKey && !ctrl && key === 'arrowleft') {
        e.preventDefault()
        const tabId = getFocusedTabId()
        if (tabId) webviewRegistry.get(tabId)?.goBack()
        return
      }

      // Alt+Right — Go forward
      if (e.altKey && !ctrl && key === 'arrowright') {
        e.preventDefault()
        const tabId = getFocusedTabId()
        if (tabId) webviewRegistry.get(tabId)?.goForward()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      unsubIPC()
    }
  }, [])
}
