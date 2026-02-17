import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTabStore } from '@/store/tabStore'
import { webviewRegistry } from './webviewRegistry'

/** Scrollbar CSS injected into every webview (module-level constant to avoid re-allocation) */
const SCROLLBAR_CSS = `
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
`

const TAB_TRANSITION_MS = 200

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
    ;(webview as unknown as { insertCSS(css: string): Promise<string> }).insertCSS(SCROLLBAR_CSS)
    batchUpdate({
      canGoBack: webview.canGoBack(),
      canGoForward: webview.canGoForward()
    })
  }, [batchUpdate])

  const handleDidStartLoading = useCallback(() => {
    batchUpdate({ isLoading: true })
  }, [batchUpdate])

  const handleDidStopLoading = useCallback(() => {
    const webview = webviewRef.current
    batchUpdate({
      isLoading: false,
      canGoBack: webview?.canGoBack() ?? false,
      canGoForward: webview?.canGoForward() ?? false
    })
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
        canGoBack: webview?.canGoBack() ?? false,
        canGoForward: webview?.canGoForward() ?? false
      })
    },
    [batchUpdate]
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

  const handleMediaStartedPlaying = useCallback(() => {
    batchUpdate({ isPlayingMedia: true })
  }, [batchUpdate])

  const handleMediaPaused = useCallback(() => {
    batchUpdate({ isPlayingMedia: false })
  }, [batchUpdate])

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
    webview.addEventListener('media-started-playing', handleMediaStartedPlaying)
    webview.addEventListener('media-paused', handleMediaPaused)

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady)
      webview.removeEventListener('did-start-loading', handleDidStartLoading)
      webview.removeEventListener('did-stop-loading', handleDidStopLoading)
      webview.removeEventListener('page-title-updated', handlePageTitleUpdated as EventListener)
      webview.removeEventListener('page-favicon-updated', handlePageFaviconUpdated as EventListener)
      webview.removeEventListener('did-navigate', handleDidNavigate as EventListener)
      webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage as EventListener)
      webview.removeEventListener('media-started-playing', handleMediaStartedPlaying)
      webview.removeEventListener('media-paused', handleMediaPaused)
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

  useEffect(() => {
    if (isActive) {
      setShouldRender(true)
    } else {
      const timer = setTimeout(() => setShouldRender(false), TAB_TRANSITION_MS + 20)
      return () => clearTimeout(timer)
    }
  }, [isActive])

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
