import { memo, useCallback, useEffect, useRef } from 'react'
import { useTabStore } from '@/store/tabStore'

interface WebViewInstanceProps {
  tabId: string
  isActive: boolean
  initialUrl: string
}

function WebViewInstanceInner({ tabId, isActive, initialUrl }: WebViewInstanceProps): React.JSX.Element {
  const webviewRef = useRef<Electron.WebviewTag | null>(null)
  const domReadyRef = useRef(false)
  const lastNavigatedUrlRef = useRef(initialUrl)

  const handleDomReady = useCallback(() => {
    domReadyRef.current = true
    const webview = webviewRef.current
    if (!webview) return

    useTabStore.getState().updateTab(tabId, {
      canGoBack: webview.canGoBack(),
      canGoForward: webview.canGoForward()
    })
  }, [tabId])

  const handleDidStartLoading = useCallback(() => {
    useTabStore.getState().updateTab(tabId, { isLoading: true })
  }, [tabId])

  const handleDidStopLoading = useCallback(() => {
    const webview = webviewRef.current
    useTabStore.getState().updateTab(tabId, {
      isLoading: false,
      canGoBack: webview?.canGoBack() ?? false,
      canGoForward: webview?.canGoForward() ?? false
    })
  }, [tabId])

  const handlePageTitleUpdated = useCallback(
    (event: Electron.PageTitleUpdatedEvent) => {
      useTabStore.getState().updateTab(tabId, { title: event.title })
    },
    [tabId]
  )

  const handlePageFaviconUpdated = useCallback(
    (event: Electron.PageFaviconUpdatedEvent) => {
      const favicon = event.favicons[0]
      if (favicon) {
        useTabStore.getState().updateTab(tabId, { favicon })
      }
    },
    [tabId]
  )

  const handleDidNavigate = useCallback(
    (event: Electron.DidNavigateEvent) => {
      const webview = webviewRef.current
      lastNavigatedUrlRef.current = event.url
      useTabStore.getState().updateTab(tabId, {
        url: event.url,
        canGoBack: webview?.canGoBack() ?? false,
        canGoForward: webview?.canGoForward() ?? false
      })
    },
    [tabId]
  )

  const handleDidNavigateInPage = useCallback(
    (event: Electron.DidNavigateInPageEvent) => {
      const webview = webviewRef.current
      if (event.isMainFrame) {
        lastNavigatedUrlRef.current = event.url
        useTabStore.getState().updateTab(tabId, {
          url: event.url,
          canGoBack: webview?.canGoBack() ?? false,
          canGoForward: webview?.canGoForward() ?? false
        })
      }
    },
    [tabId]
  )

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

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady)
      webview.removeEventListener('did-start-loading', handleDidStartLoading)
      webview.removeEventListener('did-stop-loading', handleDidStopLoading)
      webview.removeEventListener('page-title-updated', handlePageTitleUpdated as EventListener)
      webview.removeEventListener('page-favicon-updated', handlePageFaviconUpdated as EventListener)
      webview.removeEventListener('did-navigate', handleDidNavigate as EventListener)
      webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage as EventListener)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId])

  // Subscribe to store URL changes and navigate imperatively
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

  return (
    <webview
      ref={webviewRef}
      src={initialUrl}
      partition="persist:default"
      className={
        isActive
          ? 'absolute inset-0 w-full h-full z-10 visible'
          : 'absolute inset-0 w-full h-full z-0 invisible'
      }
      style={{
        display: 'inline-flex'
      }}
    />
  )
}

export const WebViewInstance = memo(WebViewInstanceInner, (prev, next) => {
  return prev.tabId === next.tabId && prev.isActive === next.isActive
})
