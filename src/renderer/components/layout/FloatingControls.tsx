import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import {
  useFocusedTabId,
  useFocusedTabCanNavigate,
  useFocusedTabUrl,
  useIsSplitView,
} from "@/hooks/useTabSelector";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { Button } from "@/components/ui/Button";
import chevronLeftSvg from "@/assets/icons/Arrows/Chevron_Left.svg?raw";
import chevronRightSvg from "@/assets/icons/Arrows/Chevron_Right.svg?raw";
import unsplitSvg from "@/assets/icons/Arrows/Triangle_Merge.svg?raw";
import { webviewRegistry } from "@/webview/webviewRegistry";
import { URLBar } from "@/components/browser/URLBar";
import { PrivateModeIndicator } from "@/components/browser/PrivateModeIndicator";
import { AppMenu } from "@/components/layout/AppMenu";
import { SpaceSwitcher } from "@/components/layout/SpaceSwitcher";
import { TabPill } from "@/components/browser/TabPill";
import { useUIStore } from "@/store/uiStore";
import { useShallow } from 'zustand/react/shallow';
import { useTabStore } from "@/store/tabStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useDownloadStore } from "@/store/downloadStore";
import { SPRING, SPRING_GENTLE, SPRING_EXPAND, SPRING_SNAPPY } from '@/utils/springs';

const THROTTLE_MS = 100;
const FLOATING_CONTROL_HEIGHT = 42;

const DownloadPill = lazy(() =>
  import("@/components/browser/DownloadPill").then((module) => ({
    default: module.DownloadPill,
  }))
);

function useIdleVisibility(isActive: boolean): boolean {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(0);
  const autoHideDelay = useSettingsStore((s) => s.autoHideDelay);
  const enableAutoHide = useSettingsStore((s) => s.enableAutoHide);

  const resetTimer = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setIsIdle(true), autoHideDelay);
  }, [autoHideDelay]);

  useEffect(() => {
    // If auto-hide is disabled, never set idle
    if (!enableAutoHide) {
      setIsIdle(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }

    if (isActive) {
      setIsIdle(false);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }

    // Only keyboard activity keeps the bar visible; mouse reveal is handled
    // exclusively by hovering the bottom-edge zone or the bar itself.
    const handleKeyActivity = (): void => {
      const now = performance.now();
      if (now - lastActivityRef.current < THROTTLE_MS) return;
      lastActivityRef.current = now;

      setIsIdle(false);
      resetTimer();
    };

    window.addEventListener("keydown", handleKeyActivity);
    resetTimer();

    return () => {
      window.removeEventListener("keydown", handleKeyActivity);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isActive, resetTimer, enableAutoHide]);

  return isIdle;
}

function FloatingControlsInner(): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const focusedTabId = useFocusedTabId();
  const focusedTabUrl = useFocusedTabUrl();
  const enableAutoHide = useSettingsStore((s) => s.enableAutoHide);
  const {
    isSettingsOpen,
    isBookmarksOpen,
    isHistoryOpen,
    isDownloadsOpen,
    isTabOverviewOpen,
    isDropdownOpen,
    isMenuOpen,
    isSpaceSwitcherOpen,
  } = useUIStore(
    useShallow((s) => ({
      isSettingsOpen: s.isSettingsOpen,
      isBookmarksOpen: s.isBookmarksOpen,
      isHistoryOpen: s.isHistoryOpen,
      isDownloadsOpen: s.isDownloadsOpen,
      isTabOverviewOpen: s.isTabOverviewOpen,
      isDropdownOpen: s.isDropdownOpen,
      isMenuOpen: s.isMenuOpen,
      isSpaceSwitcherOpen: s.isSpaceSwitcherOpen,
    }))
  );

  const disableAnimations = useSettingsStore((s) => s.disableAnimations)
  const { canGoBack, canGoForward } = useFocusedTabCanNavigate();
  const isSplit = useIsSplitView();
  const focusedPanel = useTabStore((s) => s.focusedPanel);
  const downloadCount = useDownloadStore((s) => Object.keys(s.downloads).length);
  const tabId = focusedTabId;

  const isActive =
    isHovered ||
    isInputFocused ||
    isSettingsOpen ||
    isBookmarksOpen ||
    isHistoryOpen ||
    isDownloadsOpen ||
    isTabOverviewOpen ||
    isDropdownOpen ||
    isMenuOpen ||
    isSpaceSwitcherOpen;
  const isIdle = useIdleVisibility(isActive);

  // Close transient popups when UI goes idle (but NOT full panels like settings/bookmarks/history/downloads)
  useEffect(() => {
    if (isIdle) {
      const store = useUIStore.getState();
      if (store.isDropdownOpen) store.setDropdownOpen(false);
      if (store.isMenuOpen) store.setMenuOpen(false);
      if (store.isSpaceSwitcherOpen) store.setSpaceSwitcherOpen(false);
    }
  }, [isIdle]);

  const handleFocusChange = useCallback((focused: boolean) => {
    setIsInputFocused(focused);
  }, []);

  // When the focused tab becomes an entry point (new tab / blank),
  // optionally auto-focus the URL bar so the user can immediately type.
  useEffect(() => {
    if (!focusedTabId || !focusedTabUrl) return;

    const isEntryPoint =
      focusedTabUrl === "browser://newtab" ||
      focusedTabUrl === "about:blank";

    if (!isEntryPoint) return;

    if (!useSettingsStore.getState().smartUrlBarFocus) return;

    requestAnimationFrame(() => {
      useUIStore.getState().requestUrlBarFocus();
    });
  }, [focusedTabId, focusedTabUrl]);

  const handleGoBack = useCallback(() => {
    if (!tabId) return;
    const webview = webviewRegistry.get(tabId);
    if (webview && webview.canGoBack()) {
      webview.goBack();
    } else {
      // Fall back to virtual history (e.g. back to browser://newtab)
      const tab = useTabStore.getState().tabs[tabId];
      if (tab?.virtualBackUrl) {
        useTabStore.getState().updateTab(tabId, {
          url: tab.virtualBackUrl,
          virtualForwardUrl: tab.url,
          virtualBackUrl: null,
          canGoBack: false,
          canGoForward: false,
        });
      }
    }
  }, [tabId]);

  const handleGoForward = useCallback(() => {
    if (!tabId) return;
    const tab = useTabStore.getState().tabs[tabId];
    // If on a special page with a virtual forward URL, navigate there
    if (tab && tab.url === "browser://newtab" && tab.virtualForwardUrl) {
      useTabStore.getState().updateTab(tabId, {
        url: tab.virtualForwardUrl,
        virtualBackUrl: tab.url,
        virtualForwardUrl: null,
      });
    } else {
      webviewRegistry.get(tabId)?.goForward();
    }
  }, [tabId]);

  const handleUnsplit = useCallback(() => {
    useTabStore.getState().unsplit();
  }, []);

  return (
    <>
      {/* Full-screen container (pointer-events-none) — matches PanelModal pattern */}
      <div className="fixed inset-0 z-[85] [app-region:no-drag] pointer-events-none">
        {/* Bottom positioning wrapper with hover zone */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none">
          {/* Interactive hover zone — covers bottom area, receives pointer events */}
          <AnimatePresence>
            {!isIdle && (
              <m.div
                className="absolute bottom-0 left-0 right-0 h-2 pointer-events-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              />
            )}
          </AnimatePresence>

          {/* Home-indicator hint pill — visible when toolbar is idle */}
          <AnimatePresence>
            {isIdle && (
              <m.div
                className="absolute bottom-2 pointer-events-auto [app-region:no-drag]"
                initial={disableAnimations ? undefined : { opacity: 0, scaleX: 0.5 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={disableAnimations ? undefined : { opacity: 0, scaleX: 0.6 }}
                transition={disableAnimations ? { duration: 0 } : { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div
                  className="w-32 h-[5px] rounded-full bg-[var(--app-text-tertiary)]"
                />
              </m.div>
            )}
          </AnimatePresence>

          {/* Floating controls surface */}
          <m.div
            layout
            className="absolute bottom-2 p-1 rounded-xl [app-region:no-drag] pointer-events-auto bg-[var(--app-bg-secondary)] border border-[var(--app-separator)] text-[var(--app-text-primary)]"
            initial={disableAnimations ? undefined : { y: 40, scale: 0.85, opacity: 0 }}
            animate={
              isIdle
                ? { y: 20, scale: 0.92, opacity: 0 }
                : { y: 0, scale: 1, opacity: 1 }
            }
            transition={disableAnimations ? { duration: 0 } : isIdle ? SPRING_GENTLE : SPRING}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ height: FLOATING_CONTROL_HEIGHT, willChange: "transform, opacity" }}
          >
            {/* Surface container */}
            <div className="h-full">
              {/* Pod constellation */}
              <div className="flex items-center gap-1.5 h-full max-w-[calc(100vw-40px)]">

                {/* ── Menu + Spaces Pod ── */}
                <div className="flex items-center h-full gap-0.5">
                  <AppMenu />
                  <SpaceSwitcher />
                </div>

                {/* ── Nav Pod ── */}
                {/* Keep reflow-based expansion/shrink (no width:auto transitions). */}
                <m.div className="flex items-center h-full" style={{ overflow: "hidden" }}>
                  {/* Back button slot (40px wide) */}
                  <m.div
                    className="h-full"
                    layout={false}
                    animate={{ width: canGoBack ? FLOATING_CONTROL_HEIGHT - 8 : 0 }}
                    transition={disableAnimations ? { duration: 0 } : SPRING_EXPAND}
                    style={{ overflow: "hidden" }}
                  >
                    <Button
                      variant="icon"
                      size="none"
                      onClick={handleGoBack}
                      disabled={!canGoBack}
                      aria-label="Go back"
                      whileTap={{ scale: 0.86 }}
                      initial={false}
                      animate={{
                        opacity: canGoBack ? 1 : 0,
                        scale: canGoBack ? 1 : 0.85,
                      }}
                      transition={disableAnimations ? { duration: 0 } : SPRING_EXPAND}
                      className="h-full aspect-square flex items-center justify-center transition-[background-color] duration-150 select-none disabled:opacity-40 disabled:pointer-events-none rounded-lg"
                    >
                      <SvgIcon svg={chevronLeftSvg} size={16} />
                    </Button>
                  </m.div>

                  {/* Forward button slot (40px wide) */}
                  <m.div
                    className="h-full"
                    layout={false}
                    animate={{ width: canGoForward ? FLOATING_CONTROL_HEIGHT - 8 : 0 }}
                    transition={disableAnimations ? { duration: 0 } : SPRING_EXPAND}
                    style={{ overflow: "hidden" }}
                  >
                    <Button
                      variant="icon"
                      size="none"
                      onClick={handleGoForward}
                      aria-label="Go forward"
                      whileTap={{ scale: 0.86 }}
                      disabled={!canGoForward}
                      initial={false}
                      animate={{
                        opacity: canGoForward ? 1 : 0,
                        scale: canGoForward ? 1 : 0.85,
                      }}
                      transition={disableAnimations ? { duration: 0 } : SPRING_EXPAND}
                      className="h-full aspect-square rounded-lg flex items-center justify-center transition-[background-color] duration-150 select-none disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
                    >
                      <SvgIcon svg={chevronRightSvg} size={16} />
                    </Button>
                  </m.div>
                </m.div>

                {/* ── URL Pod ── */}
                <div className="flex items-center h-full rounded-full min-w-0 flex-shrink">
                  <URLBar onFocusChange={handleFocusChange} />
                </div>

                <PrivateModeIndicator />

                {/* ── Split Unsplit Button ── */}
                <AnimatePresence initial={false}>
                  {isSplit && (
                    <m.div
                      key="unsplit-pod"
                      className="flex items-center h-full"
                      initial={{ width: 0, scale: 0.7, opacity: 0 }}
                      animate={{ width: 'auto', scale: 1, opacity: 1 }}
                      exit={{ width: 0, scale: 0.7, opacity: 0 }}
                      transition={SPRING_EXPAND}
                      style={{ overflow: 'hidden' }}
                    >
                      <Button
                        variant="icon"
                        size="none"
                        onClick={handleUnsplit}
                        aria-label="Exit split view"
                        whileTap={{ scale: 0.85 }}
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={SPRING_EXPAND}
                        className="h-full aspect-square rounded-lg flex items-center justify-center text-[var(--app-accent)] transition-[background-color] duration-100 select-none"
                      >
                        <SvgIcon svg={unsplitSvg} size={15} />
                      </Button>
                    </m.div>
                  )}
                </AnimatePresence>

                {/* ── Download Pill ── */}
                {downloadCount > 0 && (
                  <Suspense fallback={null}>
                    <DownloadPill />
                  </Suspense>
                )}

                {/* ── Tab Pod ── */}
                <div className="h-full flex-shrink-0">
                  <TabPill />
                </div>
              </div>
            </div>

            {/* Split panel indicator dots */}
            <AnimatePresence>
              {isSplit && (
                <m.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={SPRING_SNAPPY}
                  className="absolute left-1/2 -translate-x-1/2 flex gap-2"
                  style={{ bottom: "100%", marginBottom: 6 }}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${focusedPanel === "primary" ? "bg-[var(--app-accent)]" : "bg-[var(--app-text-tertiary)]"}`}
                  />
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${focusedPanel === "split" ? "bg-[var(--app-accent)]" : "bg-[var(--app-text-tertiary)]"}`}
                  />
                </m.div>
              )}
            </AnimatePresence>
          </m.div>
        </div>
      </div>
    </>
  );
}

export const FloatingControls = memo(FloatingControlsInner);
