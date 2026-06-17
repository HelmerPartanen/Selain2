import { useCallback, useEffect } from 'react'
import { useFocusedTabId, useFocusedTabUrl } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useUIStore } from '@/store/uiStore'
import { webviewRegistry } from '@/webview/webviewRegistry'

/** Shared back/forward navigation and smart URL-bar focus for browser chrome layouts. */
export function useBrowserNavigation(): {
  tabId: string | null
  handleGoBack: () => void
  handleGoForward: () => void
  handleUnsplit: () => void
  handleFocusChange: (focused: boolean) => void
} {
  const focusedTabId = useFocusedTabId()
  const focusedTabUrl = useFocusedTabUrl()
  const tabId = focusedTabId

  const handleGoBack = useCallback(() => {
    if (!tabId) return
    const webview = webviewRegistry.get(tabId)
    if (webview && webview.canGoBack()) {
      webview.goBack()
    } else {
      const tab = useTabStore.getState().tabs[tabId]
      if (tab?.virtualBackUrl) {
        useTabStore.getState().updateTab(tabId, {
          url: tab.virtualBackUrl,
          virtualForwardUrl: tab.url,
          virtualBackUrl: null,
          canGoBack: false,
          canGoForward: false,
        })
      }
    }
  }, [tabId])

  const handleGoForward = useCallback(() => {
    if (!tabId) return
    const tab = useTabStore.getState().tabs[tabId]
    if (tab && tab.url === 'browser://newtab' && tab.virtualForwardUrl) {
      useTabStore.getState().updateTab(tabId, {
        url: tab.virtualForwardUrl,
        virtualBackUrl: tab.url,
        virtualForwardUrl: null,
      })
    } else {
      webviewRegistry.get(tabId)?.goForward()
    }
  }, [tabId])

  const handleUnsplit = useCallback(() => {
    useTabStore.getState().unsplit()
  }, [])

  const handleFocusChange = useCallback((_focused: boolean) => {
    // Reserved for layouts that track input focus (e.g. floating auto-hide).
  }, [])

  useEffect(() => {
    if (!focusedTabId || !focusedTabUrl) return

    const isEntryPoint =
      focusedTabUrl === 'browser://newtab' ||
      focusedTabUrl === 'about:blank'

    if (!isEntryPoint) return
    if (!useSettingsStore.getState().smartUrlBarFocus) return

    requestAnimationFrame(() => {
      useUIStore.getState().requestUrlBarFocus()
    })
  }, [focusedTabId, focusedTabUrl])

  return { tabId, handleGoBack, handleGoForward, handleUnsplit, handleFocusChange }
}
