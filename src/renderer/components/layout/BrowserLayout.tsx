import React, {
  lazy,
  memo,
  useCallback,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence } from "motion/react";
import { FloatingControls } from "@/components/layout/FloatingControls";
import { WindowControls } from "@/components/layout/WindowControls";
import { FindBar } from "@/components/browser/FindBar";
import { SplitDivider } from "@/components/layout/SplitDivider";
import { WebViewManager } from "@/webview/WebViewManager";
import { useLRUTabManager } from "@/webview/useLRUTabManager";
import { useTabCleanupSuggestions } from "@/hooks/useTabCleanupSuggestions";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDownloadListener } from "@/hooks/useDownloadListener";
import { useAISetup } from "@/hooks/useAISetup";
import { usePermissionRequests } from "@/hooks/usePermissionRequests";
import { useTrackpadTabSwipe } from "@/hooks/useTrackpadTabSwipe";
import { useIsDark } from "@/hooks/useIsDark";
import { useTabStore } from "@/store/tabStore";
import { useThemeStore } from "@/store/themeStore";
import { useUIStore } from "@/store/uiStore";
import { dataUrlToBlobUrl } from "@/store/wallpaperDB";
import { logger } from "@/utils/logger";
import {
  isBundledKey,
  resolveBundledWallpaperUrl,
  resolveWallpaperUrl,
} from "@/theme/bundledWallpapers";
import { isPresetKey, resolvePresetUrl } from "@/theme/presets";
import { useShallow } from 'zustand/react/shallow';
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { showToast, ToastContainer } from "@/components/ui/Toast";
import { onSessionRestoreFailed } from "@/store/tabStore";
import { AISummaryButton } from "@/components/ai/AISummaryButton";
import { AIFullscreenPage } from "@/components/ai/AIFullscreenPage";
import { useSettingsStore } from "@/store/settingsStore";
import { useHistoryStore } from "@/store/historyStore";
import { useDownloadStore } from "@/store/downloadStore";
import { useBookmarkStore } from "@/store/bookmarkStore";

const SettingsPanel = lazy(() =>
  import("@/settings/SettingsPanel").then((m) => ({
    default: m.SettingsPanel,
  })),
);
const BookmarksPanel = lazy(() =>
  import("@/bookmarks/BookmarksPage").then((m) => ({
    default: m.BookmarksPanel,
  })),
);
const HistoryPanel = lazy(() =>
  import("@/history/HistoryPage").then((m) => ({ default: m.HistoryPanel })),
);
const DownloadsPanel = lazy(() =>
  import("@/downloads/DownloadsPage").then((m) => ({
    default: m.DownloadsPanel,
  })),
);
const TabOverview = lazy(() =>
  import("@/components/browser/TabOverview").then((m) => ({
    default: m.TabOverview,
  })),
);
const OnboardingFlow = lazy(() =>
  import("@/onboarding/OnboardingFlow").then((m) => ({
    default: m.OnboardingFlow,
  })),
);

const CLEAR_ON_EXIT_STORES = [
  "browser-history",
  "download-history",
  "bookmark-store",
] as const;

function PanelLoadingFallback(): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/20">
      <div
        className="w-8 h-8 rounded-full border-2 border-blue-400/60 border-t-blue-400 animate-spin"
        aria-hidden
      />
    </div>
  )
}

function MainContentErrorFallback({
  onRetry,
  onNewTab,
}: {
  onRetry: () => void;
  onNewTab: () => void;
}): React.JSX.Element {
  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700 p-8 max-w-sm text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h3 className="text-[15px] font-medium text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h3>
        <p className="text-[13px] text-gray-500 dark:text-neutral-400 mb-5">
          The tab area had a problem. Try again or open a new tab.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2 rounded-xl text-[13px] font-medium text-white bg-blue-500 hover:bg-blue-600 active:scale-[0.97] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={onNewTab}
            className="px-5 py-2 rounded-xl text-[13px] font-medium text-gray-700 dark:text-neutral-200 bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 active:scale-[0.97] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
          >
            New tab
          </button>
        </div>
      </div>
    </div>
  );
}

function BrowserLayoutInner(): React.JSX.Element {
  useLRUTabManager();
  useTabCleanupSuggestions();
  useKeyboardShortcuts();
  useDownloadListener();
  useTrackpadTabSwipe();
  useAISetup();
  usePermissionRequests();
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const uiZoom = useSettingsStore((s) => s.uiZoom);
  const clearOnExit = useSettingsStore((s) => s.clearOnExit);
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  
  // Consolidate all UIStore selectors into single subscription to reduce re-renders
  const {
    isDropdownOpen,
    isMenuOpen,
    isSettingsOpen,
    isBookmarksOpen,
    isFindBarOpen,
    isHistoryOpen,
    isDownloadsOpen,
    isTabOverviewOpen,
    isSpaceSwitcherOpen,
    setDropdownOpen: closeDropdown,
    setMenuOpen: closeMenu,
    setSpaceSwitcherOpen: closeSpaceSwitcher,
  } = useUIStore(useShallow((s) => ({
    isDropdownOpen: s.isDropdownOpen,
    isMenuOpen: s.isMenuOpen,
    isSettingsOpen: s.isSettingsOpen,
    isBookmarksOpen: s.isBookmarksOpen,
    isFindBarOpen: s.isFindBarOpen,
    isHistoryOpen: s.isHistoryOpen,
    isDownloadsOpen: s.isDownloadsOpen,
    isTabOverviewOpen: s.isTabOverviewOpen,
    isSpaceSwitcherOpen: s.isSpaceSwitcherOpen,
    setDropdownOpen: s.setDropdownOpen,
    setMenuOpen: s.setMenuOpen,
    setSpaceSwitcherOpen: s.setSpaceSwitcherOpen,
  })));
  const isSplitView = useTabStore((s) => s.splitTabId !== null);
  const [mainContentErrorKey, setMainContentErrorKey] = useState(0);

  const handleMainContentErrorRetry = useCallback(() => {
    setMainContentErrorKey((k) => k + 1);
  }, []);

  const handleMainContentErrorNewTab = useCallback(() => {
    useTabStore.getState().addTab();
    setMainContentErrorKey((k) => k + 1);
  }, []);

  // Resolve theme-aware wallpapers — preset gradients adapt to dark/light.
  const isDark = useIsDark();

  // Bundled wallpapers are lazy-loaded; cache the resolved URL so we don't re-import every frame.
  const [bundledResolvedUrl, setBundledResolvedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!wallpaper || !isBundledKey(wallpaper)) {
      setBundledResolvedUrl(null);
      return;
    }
    let cancelled = false;
    resolveBundledWallpaperUrl(wallpaper).then(
      (url) => {
        if (!cancelled) setBundledResolvedUrl(url);
      },
      () => {
        if (!cancelled) setBundledResolvedUrl(null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [wallpaper]);

  // Track all issued blob URLs to prevent accumulation
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const prevBlobRef = useRef<string | null>(null);

  // Convert data URLs to blob URLs for efficient CSS rendering.
  // Blob URLs avoid the rendering engine re-parsing multi-MB base64 strings.
  const wallpaperUrl = useMemo(() => {
    if (!wallpaper) return null;
    // Resolve preset keys (e.g. "preset:ready_bloom") to theme-appropriate SVG
    if (isPresetKey(wallpaper)) return resolvePresetUrl(wallpaper, isDark);
    // Bundled keys: use async-resolved URL (may be null until loaded)
    if (isBundledKey(wallpaper)) return bundledResolvedUrl;
    const resolved = resolveWallpaperUrl(wallpaper);
    if (!resolved) return null;
    if (resolved.startsWith("data:image/svg+xml")) return resolved;
    if (resolved.startsWith("blob:")) return resolved;

    // Create blob URL and track it immediately
    if (resolved.startsWith("data:")) {
      const blobUrl = dataUrlToBlobUrl(resolved);
      blobUrlsRef.current.add(blobUrl);
      return blobUrl;
    }
    return resolved;
  }, [wallpaper, isDark, bundledResolvedUrl]);

  // Revoke old blob URLs after new one is rendered, preventing accumulation
  useEffect(() => {
    // Revoke all blob URLs except the current one
    const toRevoke: string[] = []
    const currentUrl = wallpaperUrl
    
    for (const url of blobUrlsRef.current) {
      if (url !== currentUrl) {
        toRevoke.push(url)
      }
    }
    
    // Revoke synchronously and remove from tracking
    for (const url of toRevoke) {
      try {
        URL.revokeObjectURL(url)
        blobUrlsRef.current.delete(url)
      } catch (err) {
        logger.warn("Failed to revoke blob URL:", err)
      }
    }

    return () => {
      // On unmount, revoke all remaining blob URLs
      for (const url of blobUrlsRef.current) {
        try {
          URL.revokeObjectURL(url)
        } catch (err) {
          logger.warn("Failed to revoke blob URL on unmount:", err)
        }
      }
      blobUrlsRef.current.clear()
    }
  }, [wallpaperUrl]);

  // ── Apply UI zoom scale via Electron webFrame ──
  useEffect(() => {
    window.electronAPI.setZoomFactor(uiZoom / 100);
    return () => {
      window.electronAPI.setZoomFactor(1);
    };
  }, [uiZoom]);

  // ── Clear browsing data on exit if enabled ──
  useEffect(() => {
    if (!clearOnExit) return;
    const handleBeforeUnload = (): void => {
      useHistoryStore.getState().clearAll();
      const dlStore = useDownloadStore.getState();
      Object.keys(dlStore.downloads).forEach((id) =>
        dlStore.removeDownload(id),
      );
      const bmStore = useBookmarkStore.getState();
      bmStore.bookmarks.forEach((b) => bmStore.removeBookmark(b.url));

      // Ensure persisted data is cleared immediately instead of waiting for
      // debounced async store writes that may not finish during shutdown.
      window.electronAPI.clearStoresSync([...CLEAR_ON_EXIT_STORES]);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [clearOnExit]);

  // Gate initial tab creation on hydration to avoid a spurious blank tab
  // being added before the persisted session has been restored.
  useEffect(() => {
    function ensureTab(): void {
      if (useTabStore.getState().tabOrder.length === 0) {
        useTabStore.getState().addTab()
      }
    }

    if (useTabStore.persist.hasHydrated()) {
      ensureTab()
    } else {
      const unsub = useTabStore.persist.onFinishHydration(() => {
        ensureTab()
        unsub()
      })
    }
  }, []);

  // ── Open links from webviews in new tabs ──
  useEffect(() => {
    return window.electronAPI.onOpenUrlInNewTab((url: string) => {
      useTabStore.getState().addTab(url);
    });
  }, []);

  // ── Session restore failed (corrupt tab-session JSON) ──
  useEffect(() => {
    return onSessionRestoreFailed(() => {
      showToast({
        message: "Session could not be restored; starting fresh.",
        type: "info",
      });
      // Auto-create a new tab so user isn't left with empty tab list
      useTabStore.getState().addTab();
    });
  }, []);

  // ── Toast notification on download completion ──
  useEffect(() => {
    const prevStates = new Map<string, string>()
    return useDownloadStore.subscribe((state) => {
      for (const [id, dl] of Object.entries(state.downloads)) {
        const prev = prevStates.get(id)
        prevStates.set(id, dl.state)
        if (prev === 'progressing' && dl.state === 'completed') {
          showToast({ message: `Downloaded: ${dl.filename}`, type: 'success' })
        }
      }
      for (const id of prevStates.keys()) {
        if (!state.downloads[id]) prevStates.delete(id)
      }
    })
  }, [])

  // ── Preload heavy modal chunks after first paint (reduces first-open lag) ──
  useEffect(() => {
    const preload = (): void => {
      void import("@/settings/SettingsPanel");
      void import("@/bookmarks/BookmarksPage");
      void import("@/history/HistoryPage");
      void import("@/downloads/DownloadsPage");
      void import("@/components/browser/TabOverview");
    };

    const ric = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (ric.requestIdleCallback) {
      const id = ric.requestIdleCallback(preload, { timeout: 1200 });
      return () => {
        if (ric.cancelIdleCallback) ric.cancelIdleCallback(id);
      };
    }

    const timer = window.setTimeout(preload, 450);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="relative h-screen overflow-hidden text-gray-900 dark:text-gray-100">
      {/* Wallpaper layer — fixed behind everything */}
      <div
        className={`
        fixed inset-0 z-0 transition-opacity duration-500
        bg-gray-100 dark:bg-neutral-900
        ${wallpaperUrl ? "bg-cover bg-center bg-no-repeat" : ""}
      `}
        {...(wallpaperUrl && {
          style: { backgroundImage: `url(${wallpaperUrl})` },
        })}
      />

      {/* Transparent drag region for window movement */}
      <div className="fixed top-0 left-0 right-0 h-2.5 z-[60] [app-region:drag]" />

      {/* Web content — fills entire viewport; ErrorBoundary keeps shell usable on React errors */}
      <div className="relative z-10 h-full">
        <ErrorBoundary
          key={mainContentErrorKey}
          fallback={
            <MainContentErrorFallback
              onRetry={handleMainContentErrorRetry}
              onNewTab={handleMainContentErrorNewTab}
            />
          }
        >
          <WebViewManager />
        </ErrorBoundary>
      </div>

      {/* Floating controls overlay */}
      <FloatingControls />

      {/* AI Summary floating button (bottom-right) */}
      <AISummaryButton />

      {/* AI Fullscreen page */}
      <AIFullscreenPage />

      {/* Find bar */}
      <AnimatePresence>{isFindBarOpen && <FindBar />}</AnimatePresence>

      {/* Split divider overlay */}
      {isSplitView && <SplitDivider />}

      {/* Click-away overlay for dropdowns (rendered above webview stacking context) */}
      {(isDropdownOpen || isMenuOpen || isSpaceSwitcherOpen) && (
        <div
          className="fixed inset-0 z-[45]"
          onMouseDown={() => {
            closeDropdown(false);
            closeMenu(false);
            closeSpaceSwitcher(false);
          }}
        />
      )}

      {/* Window controls */}
      <WindowControls />

      {/* Toast notifications */}
      <ToastContainer />

      {/* Settings modal — rendered at root level to escape FloatingControls transform */}
      <AnimatePresence>
        {isSettingsOpen && (
          <ErrorBoundary>
            <Suspense fallback={<PanelLoadingFallback />}>
              <SettingsPanel />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* Bookmarks panel */}
      <AnimatePresence>
        {isBookmarksOpen && (
          <ErrorBoundary>
            <Suspense fallback={<PanelLoadingFallback />}>
              <BookmarksPanel />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* History panel */}
      <AnimatePresence>
        {isHistoryOpen && (
          <ErrorBoundary>
            <Suspense fallback={<PanelLoadingFallback />}>
              <HistoryPanel />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* Downloads panel */}
      <AnimatePresence>
        {isDownloadsOpen && (
          <ErrorBoundary>
            <Suspense fallback={<PanelLoadingFallback />}>
              <DownloadsPanel />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* Tab overview (Ctrl+Shift+A) */}
      <ErrorBoundary>
        <Suspense fallback={<PanelLoadingFallback />}>
          <TabOverview />
        </Suspense>
      </ErrorBoundary>

      {/* Onboarding — shown once for first-run users */}
      <AnimatePresence>
        {!onboardingCompleted && (
          <Suspense fallback={<PanelLoadingFallback />}>
            <OnboardingFlow />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
export const BrowserLayout = memo(BrowserLayoutInner);
