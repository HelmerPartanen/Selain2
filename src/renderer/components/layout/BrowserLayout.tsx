import React, {
  lazy,
  memo,
  useCallback,
  Suspense,
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
import { useAppSideEffects } from "@/hooks/useAppSideEffects";
import { useWallpaperBackground, useUIZoom } from "@/hooks/useWallpaperBackground";
import { useReadingToolsReveal } from "@/hooks/useReadingToolsReveal";
import { useSettingsStore } from "@/store/settingsStore";
import { useTabStore } from "@/store/tabStore";
import { useUIStore } from "@/store/uiStore";
import { useAIStore } from "@/store/aiStore";
import { useShallow } from "zustand/react/shallow";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { ToastContainer } from "@/components/ui/Toast";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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
function PanelLoadingFallback(): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--app-bg-primary)] text-[var(--app-text-primary)]">
      <LoadingSpinner size={32} />
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
    <div className="absolute inset-0 z-[90] flex items-center justify-center bg-[var(--app-bg-primary)]">
      <Card variant="elevated" padding="lg" className="max-w-sm text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <Text as="h3" size="title" tone="primary" className="mb-2">
          Something went wrong
        </Text>
        <Text size="body" tone="muted" className="mb-5">
          The tab area had a problem. Try again or open a new tab.
        </Text>
        <div className="flex gap-2 justify-center">
          <Button variant="primary" size="md" onClick={onRetry}>
            Try Again
          </Button>
          <Button variant="subtle" size="md" onClick={onNewTab}>
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
  useAppSideEffects();
  useUIZoom();

  const uiLayout = useSettingsStore((s) => s.uiLayout);
  const disableAnimations = useSettingsStore((s) => s.disableAnimations);
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
    closeTransientUI,
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
      closeTransientUI: s.closeTransientUI,
    })),
  );

  const showReadingTools = useReadingToolsReveal();
  const {
    wallpaperUrl,
    dynamicLayers,
    isDynamic: isDynamicWallpaper,
    dynamicMode,
  } = useWallpaperBackground();

  const isSummaryFrameActive = isAIFullscreenOpen && isAISummarizing;
  const isFocusedNewTab = focusedTabUrl === "browser://newtab";
  const isSplitView = useTabStore((s) => s.splitTabId !== null);
  const [mainContentErrorKey, setMainContentErrorKey] = useState(0);

  const handleMainContentErrorRetry = useCallback(() => {
    setMainContentErrorKey((k) => k + 1);
  }, []);

  const handleMainContentErrorNewTab = useCallback(() => {
    useTabStore.getState().addTab();
    setMainContentErrorKey((k) => k + 1);
  }, []);

  return (
    <div className="relative h-screen overflow-hidden bg-[var(--app-bg-primary)] text-[var(--app-text-primary)]">
      {/* Wallpaper layer — fixed behind everything */}
      <div className="fixed inset-0 z-0 bg-[var(--bg-solid-fallback)]">
        {isDynamicWallpaper ? (
          dynamicLayers.map((layer) => (
            <div
              key={layer.url}
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${layer.url})`,
                opacity: layer.opacity,
                transition: disableAnimations
                  ? undefined
                  : dynamicMode === "dynamic"
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
      {/* Web content — inset below classic chrome when applicable */}
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
            isFocusedNewTab ? "" : "bg-[var(--bg-solid-fallback)]"
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
              {/* Solid loading border */}
              <div
                className="absolute inset-0 rounded-[10px] border-2 border-[var(--app-accent)]"
                style={{
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
          onMouseDown={closeTransientUI}
        />
      )}

      {/* Window controls (floating layout — classic embeds controls in chrome) */}
      {uiLayout === "floating" && <WindowControls />}

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
      <AnimatePresence>
        {isTabOverviewOpen && (
          <ErrorBoundary>
            <Suspense fallback={<PanelLoadingFallback />}>
              <TabOverview />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

    </div>
  );
}
export const BrowserLayout = memo(BrowserLayoutInner);
