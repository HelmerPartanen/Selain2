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
import { CLASSIC_CHROME_HEIGHT } from "@/components/layout/layoutConstants";
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
import { useFocusedTabUrl } from "@/hooks/useTabSelector";
import { useIsDark } from "@/hooks/useIsDark";
import { useTabStore } from "@/store/tabStore";
import { useThemeStore } from "@/store/themeStore";
import { useUIStore } from "@/store/uiStore";
import { useAIStore } from "@/store/aiStore";
import { dataUrlToBlobUrl } from "@/store/wallpaperDB";
import { logger } from "@/utils/logger";
import { useShallow } from "zustand/react/shallow";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { showToast, ToastContainer } from "@/components/ui/Toast";
import { onSessionRestoreFailed } from "@/store/tabStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useHistoryStore } from "@/store/historyStore";
import { useDownloadStore } from "@/store/downloadStore";
import { useBookmarkStore } from "@/store/bookmarkStore";

const SettingsPanel = lazy(() =>
  import("@/settings/SettingsPanel").then((m) => ({
    default: m.SettingsPanel,
  })),
);
const ClassicBrowserChrome = lazy(() =>
  import("@/components/layout/ClassicBrowserChrome").then((m) => ({
    default: m.ClassicBrowserChrome,
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
const AIFullscreenPage = lazy(() =>
  import("@/components/ai/AIFullscreenPage").then((m) => ({
    default: m.AIFullscreenPage,
  })),
);
const ReaderModePage = lazy(() =>
  import("@/components/reader/ReaderModePage").then((m) => ({
    default: m.ReaderModePage,
  })),
);
const AISummaryButton = lazy(() =>
  import("@/components/ai/AISummaryButton").then((m) => ({
    default: m.AISummaryButton,
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

type DynamicWallpaperMode = "dynamic" | "light" | "dark";
type DynamicWallpaperLayer = { url: string; opacity: number };

const isBundledWallpaperKey = (value: string): boolean =>
  value.startsWith("bundled:");
const isDynamicWallpaperKey = (value: string): boolean =>
  value.startsWith("dynamic:");
const isPresetWallpaperKey = (value: string): boolean =>
  value.startsWith("preset:");

function PanelLoadingFallback(): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/20">
      <div
        className="w-8 h-8 rounded-full border-2 border-blue-400/60 border-t-blue-400 animate-spin"
        aria-hidden
      />
    </div>
  );
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
      <Card variant="elevated" padding="lg" className="max-w-sm text-center">
        <div className="text-3xl mb-3">âš ï¸</div>
        <Text as="h3" size="title" tone="primary" className="mb-2">
          Something went wrong
        </Text>
        <Text size="body" tone="muted" className="mb-5">
          The tab area had a problem. Try again or open a new tab.
        </Text>
        <div className="flex gap-2 justify-center">
          <Button
            variant="primary"
            size="md"
            onClick={onRetry}
          >
            Try Again
          </Button>
          <Button
            variant="subtle"
            size="md"
            onClick={onNewTab}
          >
            New tab
          </Button>
        </div>
      </Card>
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
  const uiLayout = useSettingsStore((s) => s.uiLayout);
  const disableAnimations = useSettingsStore((s) => s.disableAnimations);
  const clearOnExit = useSettingsStore((s) => s.clearOnExit);
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const isAISummarizing = useAIStore((s) => s.isSummarizing);
  const focusedTabUrl = useFocusedTabUrl();

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
    isTabStripMenuOpen,
    isDownloadPopoverOpen,
    isAIFullscreenOpen,
    isReaderModeOpen,
    setDropdownOpen: closeDropdown,
    setMenuOpen: closeMenu,
    setSpaceSwitcherOpen: closeSpaceSwitcher,
    setTabStripMenuOpen: closeTabStripMenu,
    setDownloadPopoverOpen: closeDownloadPopover,
  } = useUIStore(
    useShallow((s) => ({
      isDropdownOpen: s.isDropdownOpen,
      isMenuOpen: s.isMenuOpen,
      isSettingsOpen: s.isSettingsOpen,
      isBookmarksOpen: s.isBookmarksOpen,
      isFindBarOpen: s.isFindBarOpen,
      isHistoryOpen: s.isHistoryOpen,
      isDownloadsOpen: s.isDownloadsOpen,
      isTabOverviewOpen: s.isTabOverviewOpen,
      isSpaceSwitcherOpen: s.isSpaceSwitcherOpen,
      isTabStripMenuOpen: s.isTabStripMenuOpen,
      isDownloadPopoverOpen: s.isDownloadPopoverOpen,
      isAIFullscreenOpen: s.isAIFullscreenOpen,
      isReaderModeOpen: s.isReaderModeOpen,
      setDropdownOpen: s.setDropdownOpen,
      setMenuOpen: s.setMenuOpen,
      setSpaceSwitcherOpen: s.setSpaceSwitcherOpen,
      setTabStripMenuOpen: s.setTabStripMenuOpen,
      setDownloadPopoverOpen: s.setDownloadPopoverOpen,
    })),
  );
  const isSummaryFrameActive = isAIFullscreenOpen && isAISummarizing;
  const isFocusedNewTab = focusedTabUrl === "browser://newtab";
  const isSplitView = useTabStore((s) => s.splitTabId !== null);
  const [mainContentErrorKey, setMainContentErrorKey] = useState(0);
  const [showReadingTools, setShowReadingTools] = useState(false);

  const handleMainContentErrorRetry = useCallback(() => {
    setMainContentErrorKey((k) => k + 1);
  }, []);

  const handleMainContentErrorNewTab = useCallback(() => {
    useTabStore.getState().addTab();
    setMainContentErrorKey((k) => k + 1);
  }, []);

  // Resolve theme-aware wallpapers â€” preset gradients adapt to dark/light.
  const isDark = useIsDark();
  const isDynamicWallpaper = !!wallpaper && isDynamicWallpaperKey(wallpaper);
  const [dynamicWallpaperNow, setDynamicWallpaperNow] = useState(
    () => new Date(),
  );
  const [dynamicWallpaperMode, setDynamicWallpaperModeState] =
    useState<DynamicWallpaperMode>("dynamic");
  const [dynamicWallpaperLayers, setDynamicWallpaperLayers] = useState<
    DynamicWallpaperLayer[]
  >([]);

  useEffect(() => {
    if (!isDynamicWallpaper) return;
    setDynamicWallpaperNow(new Date());
    const id = window.setInterval(() => {
      setDynamicWallpaperNow(new Date());
    }, 60000);
    return () => window.clearInterval(id);
  }, [isDynamicWallpaper]);

  useEffect(() => {
    if (!isDynamicWallpaper) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    import("@/theme/dynamicWallpapers").then((module) => {
      if (cancelled) return;
      setDynamicWallpaperModeState(module.getDynamicWallpaperMode());
      unsubscribe = module.subscribeDynamicWallpaperMode(() => {
        setDynamicWallpaperModeState(module.getDynamicWallpaperMode());
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isDynamicWallpaper]);

  // Bundled wallpapers are lazy-loaded; cache the resolved URL so we don't re-import every frame.
  const [bundledResolvedUrl, setBundledResolvedUrl] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (!wallpaper || !isBundledWallpaperKey(wallpaper)) {
      setBundledResolvedUrl(null);
      return;
    }
    let cancelled = false;
    import("@/theme/bundledWallpapers").then((module) => {
      module.resolveBundledWallpaperUrl(wallpaper).then(
        (url) => {
          if (!cancelled) setBundledResolvedUrl(url);
        },
        () => {
          if (!cancelled) setBundledResolvedUrl(null);
        },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [wallpaper]);

  const [presetResolvedUrl, setPresetResolvedUrl] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (!wallpaper || !isPresetWallpaperKey(wallpaper)) {
      setPresetResolvedUrl(null);
      return;
    }
    let cancelled = false;
    import("@/theme/presets").then((module) => {
      if (!cancelled) {
        setPresetResolvedUrl(module.resolvePresetUrl(wallpaper, isDark));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [wallpaper, isDark]);

  // Track all issued blob URLs to prevent accumulation
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Convert data URLs to blob URLs for efficient CSS rendering.
  // Blob URLs avoid the rendering engine re-parsing multi-MB base64 strings.
  const wallpaperUrl = useMemo(() => {
    if (!wallpaper) return null;
    if (isDynamicWallpaperKey(wallpaper)) return null;
    if (isPresetWallpaperKey(wallpaper)) return presetResolvedUrl;
    // Bundled keys: use async-resolved URL (may be null until loaded)
    if (isBundledWallpaperKey(wallpaper)) return bundledResolvedUrl;
    const resolved = wallpaper;
    if (resolved.startsWith("data:image/svg+xml")) return resolved;
    if (resolved.startsWith("blob:")) return resolved;

    // Create blob URL and track it immediately
    if (resolved.startsWith("data:")) {
      const blobUrl = dataUrlToBlobUrl(resolved);
      blobUrlsRef.current.add(blobUrl);
      return blobUrl;
    }
    return resolved;
  }, [wallpaper, bundledResolvedUrl, presetResolvedUrl]);

  useEffect(() => {
    if (!isDynamicWallpaper) {
      setDynamicWallpaperLayers([]);
      return;
    }

    let cancelled = false;
    import("@/theme/dynamicWallpapers").then((module) => {
      if (cancelled) return;
      setDynamicWallpaperLayers(
        module.getDynamicWallpaperLayers(
          wallpaper,
          dynamicWallpaperNow,
          dynamicWallpaperMode,
        ),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [
    isDynamicWallpaper,
    wallpaper,
    dynamicWallpaperNow,
    dynamicWallpaperMode,
  ]);

  useEffect(() => {
    if (!isDynamicWallpaper) return;

    let urlsToPreload: string[] = [];
    const renderedUrls = new Set(
      dynamicWallpaperLayers.map((layer) => layer.url),
    );

    const preload = async (): Promise<void> => {
      const module = await import("@/theme/dynamicWallpapers");
      urlsToPreload = module
        .getDynamicWallpaperVariantUrls(wallpaper)
        .filter((url) => !renderedUrls.has(url));
      if (urlsToPreload.length === 0) return;

      for (const url of urlsToPreload) {
        const img = new Image();
        img.decoding = "async";
        img.src = url;
      }
    };

    const ric = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (ric.requestIdleCallback) {
      let idleId: number | undefined;
      const timer = window.setTimeout(() => {
        idleId = ric.requestIdleCallback?.(
          () => {
            void preload();
          },
          { timeout: 3000 },
        );
      }, 5000);
      return () => {
        window.clearTimeout(timer);
        if (ric.cancelIdleCallback && idleId !== undefined) {
          ric.cancelIdleCallback(idleId);
        }
      };
    }

    const timer = window.setTimeout(() => {
      void preload();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [dynamicWallpaperLayers, isDynamicWallpaper, wallpaper]);

  // Revoke old blob URLs after new one is rendered, preventing accumulation
  useEffect(() => {
    // Revoke all blob URLs except the current one
    const toRevoke: string[] = [];
    const currentUrl = wallpaperUrl;

    for (const url of blobUrlsRef.current) {
      if (url !== currentUrl) {
        toRevoke.push(url);
      }
    }

    // Revoke synchronously and remove from tracking
    for (const url of toRevoke) {
      try {
        URL.revokeObjectURL(url);
        blobUrlsRef.current.delete(url);
      } catch (err) {
        logger.warn("Failed to revoke blob URL:", err);
      }
    }

    return () => {
      // On unmount, revoke all remaining blob URLs
      for (const url of blobUrlsRef.current) {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          logger.warn("Failed to revoke blob URL on unmount:", err);
        }
      }
      blobUrlsRef.current.clear();
    };
  }, [wallpaperUrl]);

  // â”€â”€ Apply UI zoom scale via Electron webFrame â”€â”€
  useEffect(() => {
    window.electronAPI.setZoomFactor(uiZoom / 100);
    return () => {
      window.electronAPI.setZoomFactor(1);
    };
  }, [uiZoom]);

  // â”€â”€ Clear browsing data on exit if enabled â”€â”€
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
        useTabStore.getState().addTab();
      }
    }

    if (useTabStore.persist.hasHydrated()) {
      ensureTab();
    } else {
      const unsub = useTabStore.persist.onFinishHydration(() => {
        ensureTab();
        unsub();
      });
    }
  }, []);

  // â”€â”€ Open links from webviews in new tabs â”€â”€
  useEffect(() => {
    return window.electronAPI.onOpenUrlInNewTab((url: string) => {
      useTabStore.getState().addTab(url);
    });
  }, []);

  // â”€â”€ Session restore failed (corrupt tab-session JSON) â”€â”€
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

  // â”€â”€ Toast notification on download completion â”€â”€
  useEffect(() => {
    const prevStates = new Map<string, string>();
    return useDownloadStore.subscribe((state) => {
      for (const [id, dl] of Object.entries(state.downloads)) {
        const prev = prevStates.get(id);
        prevStates.set(id, dl.state);
        if (prev === "progressing" && dl.state === "completed") {
          showToast({ message: `Downloaded: ${dl.filename}`, type: "success" });
        }
      }
      for (const id of prevStates.keys()) {
        if (!state.downloads[id]) prevStates.delete(id);
      }
    });
  }, []);

  useEffect(() => {
    const reveal = (): void => setShowReadingTools(true);
    const ric = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (ric.requestIdleCallback) {
      let idleId: number | undefined;
      const timer = window.setTimeout(() => {
        idleId = ric.requestIdleCallback?.(reveal, { timeout: 1500 });
      }, 2500);
      return () => {
        window.clearTimeout(timer);
        if (ric.cancelIdleCallback && idleId !== undefined) {
          ric.cancelIdleCallback(idleId);
        }
      };
    }

    const timer = window.setTimeout(reveal, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  // Preload heavy modal chunks after startup settles.
  useEffect(() => {
    if (
      isSettingsOpen ||
      isBookmarksOpen ||
      isHistoryOpen ||
      isDownloadsOpen ||
      isTabOverviewOpen ||
      isAIFullscreenOpen ||
      isReaderModeOpen
    ) {
      return;
    }

    const preload = (): void => {
      void import("@/settings/SettingsPanel");
      void import("@/bookmarks/BookmarksPage");
      void import("@/history/HistoryPage");
      void import("@/downloads/DownloadsPage");
      void import("@/components/browser/TabOverview");
      void import("@/components/ai/AIFullscreenPage");
      void import("@/components/reader/ReaderModePage");
    };

    const ric = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (ric.requestIdleCallback) {
      let idleId: number | undefined;
      const timer = window.setTimeout(() => {
        idleId = ric.requestIdleCallback?.(preload, { timeout: 2000 });
      }, 10000);
      return () => {
        window.clearTimeout(timer);
        if (ric.cancelIdleCallback && idleId !== undefined) {
          ric.cancelIdleCallback(idleId);
        }
      };
    }

    const timer = window.setTimeout(preload, 10000);
    return () => window.clearTimeout(timer);
  }, [
    isSettingsOpen,
    isBookmarksOpen,
    isHistoryOpen,
    isDownloadsOpen,
    isTabOverviewOpen,
    isAIFullscreenOpen,
    isReaderModeOpen,
  ]);

  return (
    <div className="relative h-screen overflow-hidden text-gray-900 dark:text-gray-100">
      {/* Wallpaper layer â€” fixed behind everything */}
      <div className="fixed inset-0 z-0 bg-gray-100 dark:bg-neutral-900">
        {isDynamicWallpaper ? (
          dynamicWallpaperLayers.map((layer) => (
            <div
              key={layer.url}
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${layer.url})`,
                opacity: layer.opacity,
                transition: disableAnimations
                  ? undefined
                  : dynamicWallpaperMode === "dynamic"
                    ? "opacity 70s linear"
                    : "opacity 220ms ease-out",
              }}
            />
          ))
        ) : (
          <div
            className={`
            absolute inset-0 transition-opacity duration-500
            ${wallpaperUrl ? "bg-cover bg-center bg-no-repeat" : ""}
          `}
            {...(wallpaperUrl && {
              style: { backgroundImage: `url(${wallpaperUrl})` },
            })}
          />
        )}
      </div>

      {/* Transparent drag region for window movement (floating layout only) */}
      {uiLayout === "floating" && (
        <div className="fixed top-0 left-0 right-0 h-2.5 z-[60] [app-region:drag]" />
      )}
      {/* Web content â€” inset below classic chrome when applicable */}
      <div
        className="relative z-10 h-full"
        style={
          uiLayout === "classic"
            ? { paddingTop: CLASSIC_CHROME_HEIGHT }
            : undefined
        }
      >
        {isSummaryFrameActive && (
          <style>{`
      @keyframes summary-underlay-spin {
        from {
          transform: translate(-50%, -50%) rotate(0deg);
        }
        to {
          transform: translate(-50%, -50%) rotate(360deg);
        }
      }

      @keyframes summary-underlay-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `}</style>
        )}

        <div
          className={`relative isolate h-full transition-[padding] duration-150 bezier-cubic-out ${
            isFocusedNewTab ? "" : "bg-gray-100 dark:bg-neutral-900"
          }`}
          style={{
            padding: isSummaryFrameActive ? 10 : 0,
          }}
        >
          {isSummaryFrameActive && (
            <div
              className="absolute inset-0 z-0 overflow-hidden rounded-[10px]"
              style={{
                animation: disableAnimations
                  ? undefined
                  : "summary-underlay-in 0.18s ease-out 0.24s both",

                // Creates the hollow border region
                padding: 10,

                maskImage:
                  "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                WebkitMaskImage:
                  "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",

                maskComposite: "exclude",
                WebkitMaskComposite: "xor",
              }}
            >
              {/* Rotating glow */}
              <div
                className="absolute left-1/2 top-1/2 aspect-square rounded-full"
                style={{
                  width: "180%",

                  background: `
              conic-gradient(
                from 0deg,
                transparent 0deg,
                transparent 300deg,
                rgba(230,59,246,0.15) 320deg,
                rgba(230, 59, 246, 0.95) 340deg,
                rgba(96,165,250,1) 350deg,
                rgba(59,130,246,0.95) 360deg
              )
            `,

                  filter: "blur(22px)",
                  opacity: 1,

                  transform: "translate(-50%, -50%)",
                  transformOrigin: "50% 50%",
                  willChange: "transform",

                  animation: disableAnimations
                    ? undefined
                    : "summary-underlay-spin 2.8s linear infinite",
                }}
              />
            </div>
          )}

          <div
            className="relative z-10 h-full overflow-hidden"
            style={{ borderRadius: isSummaryFrameActive ? 10 : 0 }}
          >
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
        </div>
      </div>
      {/* Browser chrome */}
      {uiLayout === "floating" ? (
        <FloatingControls />
      ) : (
        <Suspense fallback={null}>
          <ClassicBrowserChrome />
        </Suspense>
      )}

      {/* AI Summary floating button (bottom-right) */}
      {showReadingTools && (
        <Suspense fallback={null}>
          <AISummaryButton />
        </Suspense>
      )}

      {/* AI Fullscreen page */}
      <AnimatePresence>
        {isAIFullscreenOpen && (
          <Suspense fallback={<PanelLoadingFallback />}>
            <AIFullscreenPage />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Reader mode overlay */}
      <AnimatePresence>
        {isReaderModeOpen && (
          <Suspense fallback={<PanelLoadingFallback />}>
            <ReaderModePage />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Find bar */}
      <AnimatePresence>{isFindBarOpen && <FindBar />}</AnimatePresence>

      {/* Split divider overlay */}
      {isSplitView && <SplitDivider />}

      {/* Click-away overlay for dropdowns (rendered above webview stacking context) */}
      {(isDropdownOpen ||
        isMenuOpen ||
        isSpaceSwitcherOpen ||
        isTabStripMenuOpen ||
        isDownloadPopoverOpen) && (
        <div
          className="fixed inset-0 z-[45]"
          onMouseDown={() => {
            closeDropdown(false);
            closeMenu(false);
            closeSpaceSwitcher(false);
            closeTabStripMenu(false);
            closeDownloadPopover(false);
          }}
        />
      )}

      {/* Window controls (floating layout â€” classic embeds controls in chrome) */}
      {uiLayout === "floating" && <WindowControls />}

      {/* Toast notifications */}
      <ToastContainer />

      {/* Settings modal â€” rendered at root level to escape FloatingControls transform */}
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
      <AnimatePresence>
        {isTabOverviewOpen && (
          <ErrorBoundary>
            <Suspense fallback={<PanelLoadingFallback />}>
              <TabOverview />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* Onboarding â€” shown once for first-run users */}
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
