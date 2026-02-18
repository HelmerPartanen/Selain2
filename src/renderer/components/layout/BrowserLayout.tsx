import {
  lazy,
  memo,
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { AnimatePresence } from "motion/react";
import { FloatingControls } from "@/components/layout/FloatingControls";
import { WindowControls } from "@/components/layout/WindowControls";
import { FindBar } from "@/components/browser/FindBar";
import { SplitDivider } from "@/components/layout/SplitDivider";
import { WebViewManager } from "@/webview/WebViewManager";
import { useLRUTabManager } from "@/webview/useLRUTabManager";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDownloadListener } from "@/hooks/useDownloadListener";
import { useTrackpadTabSwipe } from "@/hooks/useTrackpadTabSwipe";
import { useIsDark } from "@/hooks/useIsDark";
import { useTabStore } from "@/store/tabStore";
import { useThemeStore } from "@/store/themeStore";
import { useUIStore } from "@/store/uiStore";
import { dataUrlToBlobUrl } from "@/store/wallpaperDB";
import { resolveWallpaperUrl } from "@/theme/bundledWallpapers";
import { isPresetKey, resolvePresetUrl } from "@/theme/presets";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastContainer } from "@/components/ui/Toast";
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
const HotkeysPanel = lazy(() =>
  import("@/hotkeys/HotkeysPanel").then((m) => ({ default: m.HotkeysPanel })),
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

function BrowserLayoutInner(): React.JSX.Element {
  useLRUTabManager();
  useKeyboardShortcuts();
  useDownloadListener();
  useTrackpadTabSwipe();
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const uiZoom = useSettingsStore((s) => s.uiZoom);
  const clearOnExit = useSettingsStore((s) => s.clearOnExit);
  const isDropdownOpen = useUIStore((s) => s.isDropdownOpen);
  const isMenuOpen = useUIStore((s) => s.isMenuOpen);
  const isSettingsOpen = useUIStore((s) => s.isSettingsOpen);
  const isBookmarksOpen = useUIStore((s) => s.isBookmarksOpen);
  const isFindBarOpen = useUIStore((s) => s.isFindBarOpen);
  const isHistoryOpen = useUIStore((s) => s.isHistoryOpen);
  const isDownloadsOpen = useUIStore((s) => s.isDownloadsOpen);
  const isHotkeysOpen = useUIStore((s) => s.isHotkeysOpen);
  const isTabOverviewOpen = useUIStore((s) => s.isTabOverviewOpen);
  const isSplitView = useTabStore((s) => s.splitTabId !== null);
  const closeDropdown = useUIStore((s) => s.setDropdownOpen);
  const closeMenu = useUIStore((s) => s.setMenuOpen);
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);

  // Resolve theme-aware wallpapers — preset gradients adapt to dark/light.
  const isDark = useIsDark();

  // Convert data URLs to blob URLs for efficient CSS rendering.
  // Blob URLs avoid the rendering engine re-parsing multi-MB base64 strings.
  // NOTE: Revocation is deferred to useEffect (after commit) so the DOM
  // never references a revoked blob URL during the render-to-commit gap.
  const prevBlobRef = useRef<string | null>(null);
  const wallpaperUrl = useMemo(() => {
    if (!wallpaper) return null;
    // Resolve preset keys (e.g. "preset:ready_bloom") to theme-appropriate SVG
    if (isPresetKey(wallpaper)) return resolvePresetUrl(wallpaper, isDark);
    // Resolve bundled keys (e.g. "bundled:image.jpg") to Vite asset URLs
    const resolved = resolveWallpaperUrl(wallpaper);
    if (!resolved) return null;
    if (resolved.startsWith("data:image/svg+xml")) return resolved;
    if (resolved.startsWith("blob:")) return resolved;
    if (resolved.startsWith("data:")) return dataUrlToBlobUrl(resolved);
    return resolved;
  }, [wallpaper, isDark]);

  // Revoke the previous blob URL after React has committed the new one to the DOM
  useEffect(() => {
    const prev = prevBlobRef.current;
    // Only revoke if it's a blob URL we created (not one from the store)
    if (prev && prev !== wallpaperUrl) {
      URL.revokeObjectURL(prev);
    }
    // Track the current blob URL for future cleanup
    prevBlobRef.current =
      wallpaperUrl &&
      wallpaperUrl.startsWith("blob:") &&
      !wallpaper?.startsWith("blob:")
        ? wallpaperUrl
        : null;

    return () => {
      // On unmount, revoke any outstanding blob URL
      if (prevBlobRef.current) {
        URL.revokeObjectURL(prevBlobRef.current);
        prevBlobRef.current = null;
      }
    };
  }, [wallpaperUrl, wallpaper]);

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
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [clearOnExit]);

  useEffect(() => {
    const state = useTabStore.getState();
    if (state.tabOrder.length === 0) {
      state.addTab();
    }
  }, []);

  // ── Open links from webviews in new tabs ──
  useEffect(() => {
    return window.electronAPI.onOpenUrlInNewTab((url: string) => {
      useTabStore.getState().addTab(url);
    });
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
      <div className="fixed top-0 left-0 right-[138px] h-2.5 z-[60] [app-region:drag]" />

      {/* Web content — fills entire viewport */}
      <div className="relative z-10 h-full">
        <WebViewManager />
      </div>

      {/* Floating controls overlay */}
      <FloatingControls />

      {/* Find bar */}
      <AnimatePresence>{isFindBarOpen && <FindBar />}</AnimatePresence>

      {/* Split divider overlay */}
      {isSplitView && <SplitDivider />}

      {/* Click-away overlay for dropdowns (rendered above webview stacking context) */}
      {(isDropdownOpen || isMenuOpen) && (
        <div
          className="fixed inset-0 z-[45]"
          onMouseDown={() => {
            closeDropdown(false);
            closeMenu(false);
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
            <Suspense fallback={null}>
              <SettingsPanel />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* Bookmarks panel */}
      <AnimatePresence>
        {isBookmarksOpen && (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <BookmarksPanel />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* History panel */}
      <AnimatePresence>
        {isHistoryOpen && (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <HistoryPanel />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* Downloads panel */}
      <AnimatePresence>
        {isDownloadsOpen && (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <DownloadsPanel />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* Hotkeys panel */}
      <AnimatePresence>
        {isHotkeysOpen && (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <HotkeysPanel />
            </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* Tab overview (Ctrl+Shift+A) */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <TabOverview />
        </Suspense>
      </ErrorBoundary>

      {/* Onboarding — shown once for first-run users */}
      <AnimatePresence>
        {!onboardingCompleted && (
          <Suspense fallback={null}>
            <OnboardingFlow />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
export const BrowserLayout = memo(BrowserLayoutInner);
