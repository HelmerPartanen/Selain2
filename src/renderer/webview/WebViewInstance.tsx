import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTabStore } from '@/store/tabStore'
import { useHistoryStore } from '@/store/historyStore'
import { logger } from '@/utils/logger'
import { webviewRegistry } from './webviewRegistry'
import { handleTabSwipeDelta } from '@/hooks/useTrackpadTabSwipe'

/** Scrollbar CSS injected into every webview (module-level constant to avoid re-allocation) */
const SCROLLBAR_CSS = `
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
`

const TAB_TRANSITION_MS = 100

interface WebViewInstanceProps {
  tabId: string
  isActive: boolean
  initialUrl: string
}

function WebViewInstanceInner({ tabId, isActive, initialUrl }: WebViewInstanceProps): React.JSX.Element {
  const webviewRef = useRef<Electron.WebviewTag | null>(null)
  const domReadyRef = useRef(false)
  const lastNavigatedUrlRef = useRef(initialUrl)

  // Batch pending store updates to reduce Zustand set() calls
  const pendingUpdateRef = useRef<Record<string, unknown> | null>(null)
  const rafIdRef = useRef<number>(0)
  const progressResetTimerRef = useRef<number | null>(null)

  const flushUpdate = useCallback(() => {
    const patch = pendingUpdateRef.current
    if (patch) {
      pendingUpdateRef.current = null
      useTabStore.getState().updateTab(tabId, patch as Partial<Omit<import('@/store/tabStore').Tab, 'id'>>)
    }
  }, [tabId])

  const batchUpdate = useCallback((patch: Record<string, unknown>) => {
    pendingUpdateRef.current = { ...pendingUpdateRef.current, ...patch }
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = requestAnimationFrame(flushUpdate)
  }, [flushUpdate])

  const handleDomReady = useCallback(() => {
    domReadyRef.current = true
    const webview = webviewRef.current
    if (!webview) return
      ; (webview as unknown as { insertCSS(css: string): Promise<string> }).insertCSS(SCROLLBAR_CSS)

    // Inject horizontal trackpad scroll capture
    const interceptScript = `
      (function() {
        const debug = console.debug;
        window.addEventListener('wheel', (e) => {
          if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            debug('BROWSER_ACTION:swipe:' + e.deltaX + ':' + e.deltaY + ':' + JSON.stringify(e.ctrlKey));
          }
        }, { passive: true });
      })();
    `;
    (webview as unknown as { executeJavaScript(code: string): Promise<void> }).executeJavaScript(interceptScript)

    batchUpdate({
      loadProgress: 0.7,
      canGoBack: webview.canGoBack(),
      canGoForward: webview.canGoForward()
    })
  }, [batchUpdate])

  const handleDidStartLoading = useCallback(() => {
    batchUpdate({ isLoading: true, loadProgress: 0.15 })
  }, [batchUpdate])

  const handleDidStopLoading = useCallback(() => {
    const webview = webviewRef.current
    batchUpdate({
      isLoading: false,
      loadProgress: 1,
      canGoBack: webview?.canGoBack() ?? false,
      canGoForward: webview?.canGoForward() ?? false
    })
    // Reset progress after animation
    if (progressResetTimerRef.current !== null) {
      window.clearTimeout(progressResetTimerRef.current)
    }
    progressResetTimerRef.current = window.setTimeout(() => {
      batchUpdate({ loadProgress: 0 })
      progressResetTimerRef.current = null
    }, 400)
  }, [batchUpdate])

  const handlePageTitleUpdated = useCallback(
    (event: Electron.PageTitleUpdatedEvent) => {
      batchUpdate({ title: event.title })
    },
    [batchUpdate]
  )

  const handlePageFaviconUpdated = useCallback(
    (event: Electron.PageFaviconUpdatedEvent) => {
      const favicon = event.favicons[0]
      if (favicon) {
        batchUpdate({ favicon })
      }
    },
    [batchUpdate]
  )

  const handleDidNavigate = useCallback(
    (event: Electron.DidNavigateEvent) => {
      const webview = webviewRef.current
      lastNavigatedUrlRef.current = event.url
      batchUpdate({
        url: event.url,
        loadProgress: 0.4,
        canGoBack: webview?.canGoBack() ?? false,
        canGoForward: webview?.canGoForward() ?? false
      })
      // Record to history
      const tab = useTabStore.getState().tabs[tabId]
      if (tab) useHistoryStore.getState().recordVisit(event.url, tab.title, tab.favicon)
    },
    [batchUpdate, tabId]
  )

  const handleDidNavigateInPage = useCallback(
    (event: Electron.DidNavigateInPageEvent) => {
      const webview = webviewRef.current
      if (event.isMainFrame) {
        lastNavigatedUrlRef.current = event.url
        batchUpdate({
          url: event.url,
          canGoBack: webview?.canGoBack() ?? false,
          canGoForward: webview?.canGoForward() ?? false
        })
      }
    },
    [batchUpdate]
  )

  const handleDidFailLoad = useCallback(
    (event: Electron.DidFailLoadEvent) => {
      // Ignore subframe failures and user-aborted navigations
      if (!event.isMainFrame) return
      if (event.errorCode === -3) return // ERR_ABORTED (user navigated away)
      const webview = webviewRef.current
      batchUpdate({
        isLoading: false,
        loadProgress: 0,
        canGoBack: webview?.canGoBack() ?? false,
        canGoForward: webview?.canGoForward() ?? false
      })
    },
    [batchUpdate]
  )

  const handleMediaStartedPlaying = useCallback(() => {
    batchUpdate({ isPlayingMedia: true })
  }, [batchUpdate])

  const handleMediaPaused = useCallback(() => {
    batchUpdate({ isPlayingMedia: false })
  }, [batchUpdate])

  // When the webview gains focus (user clicks inside it), update the focused panel
  const handleWebviewFocus = useCallback(() => {
    const state = useTabStore.getState()
    if (!state.splitTabId) return // Not in split mode
    if (tabId === state.activeTabId && state.focusedPanel !== 'primary') {
      state.setFocusedPanel('primary')
    } else if (tabId === state.splitTabId && state.focusedPanel !== 'split') {
      state.setFocusedPanel('split')
    }
  }, [tabId])

  const handleConsoleMessage = useCallback((event: any) => {
    if (event.level === 0 && event.message.startsWith('BROWSER_ACTION:swipe:')) {
      const parts = event.message.split(':')
      const deltaX = parseFloat(parts[2] || '0')
      const deltaY = parseFloat(parts[3] || '0')
      const ctrlKey = parts[4] === 'true'
      handleTabSwipeDelta(deltaX, deltaY, ctrlKey)
    }
  }, [])

  // Register/unregister in the global webview registry
  useEffect(() => {
    const webview = webviewRef.current
    if (webview) {
      webviewRegistry.register(tabId, webview)
    }
    return () => {
      webviewRegistry.unregister(tabId)
      // Cancel any pending batched updates on unmount
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      if (progressResetTimerRef.current !== null) {
        window.clearTimeout(progressResetTimerRef.current)
      }
    }
  }, [tabId])

  // One-time event listener attachment on mount
  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    webview.addEventListener('dom-ready', handleDomReady)
    webview.addEventListener('did-start-loading', handleDidStartLoading)
    webview.addEventListener('did-stop-loading', handleDidStopLoading)
    webview.addEventListener('page-title-updated', handlePageTitleUpdated as EventListener)
    webview.addEventListener('page-favicon-updated', handlePageFaviconUpdated as EventListener)
    webview.addEventListener('did-navigate', handleDidNavigate as EventListener)
    webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage as EventListener)
    webview.addEventListener('did-fail-load', handleDidFailLoad as EventListener)
    webview.addEventListener('media-started-playing', handleMediaStartedPlaying)
    webview.addEventListener('media-paused', handleMediaPaused)
    webview.addEventListener('focus', handleWebviewFocus)
    webview.addEventListener('console-message', handleConsoleMessage as EventListener)

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady)
      webview.removeEventListener('did-start-loading', handleDidStartLoading)
      webview.removeEventListener('did-stop-loading', handleDidStopLoading)
      webview.removeEventListener('page-title-updated', handlePageTitleUpdated as EventListener)
      webview.removeEventListener('page-favicon-updated', handlePageFaviconUpdated as EventListener)
      webview.removeEventListener('did-navigate', handleDidNavigate as EventListener)
      webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage as EventListener)
      webview.removeEventListener('did-fail-load', handleDidFailLoad as EventListener)
      webview.removeEventListener('media-started-playing', handleMediaStartedPlaying)
      webview.removeEventListener('media-paused', handleMediaPaused)
      webview.removeEventListener('focus', handleWebviewFocus)
      webview.removeEventListener('console-message', handleConsoleMessage as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId])

  // Subscribe to store URL changes and navigate imperatively.
  // Uses a custom equality check so it only fires on actual URL changes,
  // not on title/favicon/loading mutations.
  useEffect(() => {
    const unsub = useTabStore.subscribe(
      (state) => state.tabs[tabId]?.url,
      (newUrl) => {
        const webview = webviewRef.current
        if (!webview || !newUrl) return
        if (newUrl === lastNavigatedUrlRef.current) return
        lastNavigatedUrlRef.current = newUrl
        if (domReadyRef.current) {
          webview.loadURL(newUrl)
        }
      }
    )
    return unsub
  }, [tabId])

  // Keep the outgoing tab visible during exit animation, then truly hide it
  const [shouldRender, setShouldRender] = useState(isActive)
  const prevIsActiveRef = useRef(isActive)

  useEffect(() => {
    // If we transition from active to inactive, capture it right now
    if (prevIsActiveRef.current && !isActive) {
      const takeSnapshot = async () => {
        const webview = webviewRef.current
        if (!webview) return
        const tabIdStr = String(tabId)

        try {
          const thumbnail = await webviewRegistry.capturePage(tabIdStr)
          if (thumbnail) {
            useTabStore.getState().updateTab(tabIdStr, { thumbnail })
          }
        } catch (e) {
          logger.warn("Could not capture tab thumbnail before hiding", e)
        }
      }
      takeSnapshot()
    }
    prevIsActiveRef.current = isActive

    if (isActive) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => setShouldRender(false), TAB_TRANSITION_MS + 20)
      return () => clearTimeout(timer)
    }
  }, [isActive, tabId])

  const isVisible = isActive || shouldRender

  return (
    <div
      className="absolute inset-0 w-full h-full"
      style={{
        opacity: isActive ? 1 : 0,
        transform: isActive ? 'scale(1)' : 'scale(0.97)',
        transition: `opacity ${TAB_TRANSITION_MS}ms ease-out, transform ${TAB_TRANSITION_MS}ms ease-out`,
        zIndex: isActive ? 10 : 1,
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isActive ? 'auto' : 'none'
      }}
    >
      <webview
        ref={webviewRef}
        src={initialUrl}
        partition="persist:default"
        {...{ plugins: '', allowpopups: '', allow: 'encrypted-media; autoplay; fullscreen' } as Record<string, string>}
        className="w-full h-full"
        style={{ display: 'inline-flex' }}
      />
    </div>
  )
}

export const WebViewInstance = memo(WebViewInstanceInner, (prev, next) => {
  return prev.tabId === next.tabId && prev.isActive === next.isActive
})
