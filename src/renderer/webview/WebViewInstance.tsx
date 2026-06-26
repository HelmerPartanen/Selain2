import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTabStore } from '@/store/tabStore'
import { useHistoryStore } from '@/store/historyStore'
import { logger } from '@/utils/logger'
import { webviewRegistry } from './webviewRegistry'
import { handleTabSwipeDelta } from '@/hooks/useTrackpadTabSwipe'
import { isSpecialPage } from '@/utils/urlUtils'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'

/** Scrollbar CSS injected into every webview (module-level constant to avoid re-allocation) */
const SCROLLBAR_CSS = `
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2C2C2E; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #1C1C1E; }
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
  // Use 1ms timer debounce instead of RAF to reduce microtask queue buildup with many tabs
  const pendingUpdateRef = useRef<Record<string, unknown> | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const progressResetTimerRef = useRef<number | null>(null)

  const [errorState, setErrorState] = useState<{ code: number; description: string } | null>(null)

  const flushUpdate = useCallback(() => {
    const patch = pendingUpdateRef.current
    if (patch) {
      pendingUpdateRef.current = null
      try {
        useTabStore.getState().updateTab(tabId, patch as Partial<Omit<import('@/store/tabStore').Tab, 'id'>>)
      } catch (error) {
        logger.error(`[WebViewInstance] Failed to flush tab update for ${tabId}:`, error)
        // Re-queue the patch for retry on next debounce cycle
        pendingUpdateRef.current = patch
      }
    }
  }, [tabId])

  const batchUpdate = useCallback((patch: Record<string, unknown>) => {
    pendingUpdateRef.current = { ...pendingUpdateRef.current, ...patch }
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    // Use 1ms debounce: fast enough to feel responsive, allows events to batch naturally
    debounceTimerRef.current = window.setTimeout(flushUpdate, 1)
  }, [flushUpdate])

  const handleDomReady = useCallback(() => {
    domReadyRef.current = true
    const webview = webviewRef.current
    if (!webview) return
    // Restore mute state if the tab was muted before this webview initialized
    const { isMuted } = useTabStore.getState().tabs[tabId] ?? {}
    if (isMuted) (webview as unknown as { setAudioMuted(m: boolean): void }).setAudioMuted(true)
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
  }, [batchUpdate, tabId])

  const handleDidStartLoading = useCallback(() => {
    setErrorState(null)
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
      // Patch the history entry for the current URL with the real page title,
      // since at navigate time the title was still the previous page's value.
      if (lastNavigatedUrlRef.current) {
        useHistoryStore.getState().patchEntryTitle(lastNavigatedUrlRef.current, event.title)
      }
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
      setErrorState(null)
      const webview = webviewRef.current
      lastNavigatedUrlRef.current = event.url
      batchUpdate({
        url: event.url,
        loadProgress: 0.4,
        canGoBack: webview?.canGoBack() ?? false,
        canGoForward: webview?.canGoForward() ?? false
      })
      // Record to history with an empty title — the real title arrives in
      // handlePageTitleUpdated and is patched via patchEntryTitle.
      useHistoryStore.getState().recordVisit(event.url, '', undefined)
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
      setErrorState({ code: event.errorCode, description: event.errorDescription })
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
    try {
      if (!event || typeof event.message !== 'string') return
      if (event.level === 0 && event.message.startsWith('BROWSER_ACTION:swipe:')) {
        const parts = event.message.split(':')
        // Defensive parsing: ensure we have enough parts before accessing
        if (parts.length < 4) return
        const deltaX = parseFloat(parts[2] || '0')
        const deltaY = parseFloat(parts[3] || '0')
        const ctrlKey = parts[4] === 'true'
        if (!isNaN(deltaX) && !isNaN(deltaY)) {
          handleTabSwipeDelta(deltaX, deltaY, ctrlKey)
        }
      }
    } catch (err) {
      logger.warn(`[WebViewInstance] Failed to parse console message for tab ${tabId}:`, err)
    }
  }, [handleTabSwipeDelta, tabId])

  // Register/unregister in the global webview registry
  useEffect(() => {
    const webview = webviewRef.current
    if (webview) {
      webviewRegistry.register(tabId, webview)
    }
    return () => {
      webviewRegistry.unregister(tabId)
      // Cancel pending batched updates on unmount
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
      if (progressResetTimerRef.current !== null) {
        window.clearTimeout(progressResetTimerRef.current)
      }
    }
  }, [tabId])

  // One-time event listener attachment on mount
  // Dependencies include all handler functions to ensure effect re-runs only when handlers change
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
  }, [
    tabId,
    handleDomReady,
    handleDidStartLoading,
    handleDidStopLoading,
    handlePageTitleUpdated,
    handlePageFaviconUpdated,
    handleDidNavigate,
    handleDidNavigateInPage,
    handleDidFailLoad,
    handleMediaStartedPlaying,
    handleMediaPaused,
    handleWebviewFocus,
    handleConsoleMessage
  ])

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
        // Do not load special pages (e.g. browser://newtab) in the webview — they are rendered in-app.
        if (isSpecialPage(newUrl)) return
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
  const activeSinceRef = useRef<number>(isActive ? performance.now() : 0)
  const inFlightCaptureRef = useRef<Promise<string | null> | null>(null)

  useEffect(() => {
    // If we transition from active to inactive, capture it — but only if the
    // tab was actually active long enough that the user looked at it.
    // Rapid Ctrl+Tab sequences otherwise trigger a flood of capturePage IPCs.
    if (prevIsActiveRef.current && !isActive) {
      const MIN_ACTIVE_MS = 1500
      const tabIdStr = String(tabId)
      const activeFor = performance.now() - activeSinceRef.current
      const alreadyHasThumbnail = !!useTabStore.getState().tabs[tabIdStr]?.thumbnail

      // Coalesce: if a capture is already in flight for this tab, don't kick off another.
      if (!inFlightCaptureRef.current && activeFor >= MIN_ACTIVE_MS && !alreadyHasThumbnail) {
        const webview = webviewRef.current
        if (webview) {
          const capturePromise = webviewRegistry.capturePage(tabIdStr)
          inFlightCaptureRef.current = capturePromise
          capturePromise
            .then((thumbnail) => {
              if (thumbnail) {
                useTabStore.getState().updateTab(tabIdStr, { thumbnail })
              }
            })
            .catch((e) => {
              logger.warn('Could not capture tab thumbnail before hiding', e)
            })
            .finally(() => {
              inFlightCaptureRef.current = null
            })
        }
      }
    }
    prevIsActiveRef.current = isActive
    if (isActive) activeSinceRef.current = performance.now()

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
        transition: isActive ? 'none' : `opacity ${TAB_TRANSITION_MS}ms ease-out, transform ${TAB_TRANSITION_MS}ms ease-out`,
        zIndex: isActive ? 10 : 1,
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isActive ? 'auto' : 'none'
      }}
    >
      <webview
        ref={webviewRef}
        src={initialUrl}
        partition="persist:default"
        useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        {...{ plugins: '', allowpopups: '', allow: 'encrypted-media; autoplay; fullscreen' } as Record<string, string>}
        className="w-full h-full"
        style={{ display: 'inline-flex' }}
      />
      {errorState && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-950 select-none px-8">
          <Text as="span" className="text-6xl font-thin text-gray-200 dark:text-neutral-800 tabular-nums">{errorState.code}</Text>
          <Text as="h2" size="title" tone="primary" className="text-base font-semibold text-gray-800 dark:text-neutral-200">
            This page can&apos;t be reached
          </Text>
          <Text size="body" tone="muted" className="max-w-xs text-center text-sm">
            {errorState.description}
          </Text>
          <Button
            variant="primary"
            size="md"
            rounded="rounded-full"
            onClick={() => { webviewRef.current?.reload(); setErrorState(null) }}
            className="mt-1"
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}

export const WebViewInstance = memo(WebViewInstanceInner, (prev, next) => {
  return prev.tabId === next.tabId && prev.isActive === next.isActive
})
