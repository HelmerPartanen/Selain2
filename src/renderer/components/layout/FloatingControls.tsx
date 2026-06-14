import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  useFocusedTabId,
  useFocusedTabCanNavigate,
  useFocusedTabUrl,
  useIsSplitView,
} from "@/hooks/useTabSelector";
import { SvgIcon } from "@/components/ui/SvgIcon";
import chevronLeftSvg from "@/assets/icons/Arrows/Chevron_Left.svg?raw";
import chevronRightSvg from "@/assets/icons/Arrows/Chevron_Right.svg?raw";
import unsplitSvg from "@/assets/icons/Arrows/Triangle_Merge.svg?raw";
import { webviewRegistry } from "@/webview/webviewRegistry";
import { URLBar } from "@/components/browser/URLBar";
import { AppMenu } from "@/components/layout/AppMenu";
import { SpaceSwitcher } from "@/components/layout/SpaceSwitcher";
import { TabPill } from "@/components/browser/TabPill";
import { DownloadPill } from "@/components/browser/DownloadPill";
import { useUIStore } from "@/store/uiStore";
import { useShallow } from 'zustand/react/shallow';
import { useTabStore } from "@/store/tabStore";
import { useSettingsStore } from "@/store/settingsStore";
import { SPRING, SPRING_GENTLE, SPRING_EXPAND, SPRING_SNAPPY } from '@/utils/springs';

const THROTTLE_MS = 100;

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
  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects)
  const { canGoBack, canGoForward } = useFocusedTabCanNavigate();
  const isSplit = useIsSplitView();
  const focusedPanel = useTabStore((s) => s.focusedPanel);
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
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-32 pointer-events-auto"
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
              <motion.div
                className="absolute bottom-2 pointer-events-auto [app-region:no-drag]"
                initial={disableAnimations ? undefined : { opacity: 0, scaleX: 0.5 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={disableAnimations ? undefined : { opacity: 0, scaleX: 0.5 }}
                transition={disableAnimations ? { duration: 0 } : { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div
                  className="w-32 h-[5px] rounded-full bg-gray-500/80 dark:bg-neutral-300/70"
                  style={{ animation: disableAnimations ? 'none' : 'hint-pulse 3s ease-in-out infinite' }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating controls — frosted glass surface with backdrop blur */}
          <motion.div
            className={`absolute bottom-5 mb-0 rounded-full [app-region:no-drag] pointer-events-auto drop-shadow-lg ${disableBlurEffects ? 'bg-white/96 dark:bg-[#121316]/96 border border-black/10 dark:border-white/10' : 'bg-white/90 dark:bg-[#1D1F23]/90 backdrop-blur-xs border border-black/5 dark:border-white/5'}`}
            initial={disableAnimations ? undefined : { y: 40, scale: 0.85, opacity: 0 }}
            animate={
              isIdle
                ? { y: 20, scale: 0.92, opacity: 0 }
                : { y: 0, scale: 1, opacity: 1 }
            }
            transition={disableAnimations ? { duration: 0 } : isIdle ? SPRING_GENTLE : SPRING}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ willChange: "transform, opacity" }}
          >
            {/* Glass surface container with blur */}
            <div className="">
              {/* Pod constellation — separate glass pills with liquid morphing */}
              <div className="flex items-center gap-1.5 max-w-[calc(100vw-40px)]">

                {/* ── Menu + Spaces Pod ── */}
                <div className="flex items-center rounded-full gap-0.5">
                  <AppMenu />
                  <SpaceSwitcher />
                </div>

                {/* ── Nav Pod ── */}
                <AnimatePresence initial={false}>
                  {(canGoBack || canGoForward) && (
                    <motion.div
                      key="nav-pod"
                      className="flex items-center rounded-full gap-0.5"
                      initial={{ width: 0, scale: 0.7, opacity: 0, filter: 'blur(6px)' }}
                      animate={{ width: 'auto', scale: 1, opacity: 1, filter: 'blur(0px)' }}
                      exit={{ width: 0, scale: 0.7, opacity: 0, filter: 'blur(6px)' }}
                      transition={SPRING_EXPAND}
                      style={{ overflow: 'hidden' }}
                    >
                      <AnimatePresence initial={false}>
                        {canGoBack && (
                          <motion.button
                            key="back"
                            onClick={handleGoBack}
                            disabled={!canGoBack}
                            aria-label="Go back"
                            whileTap={{ scale: 0.82, x: -2, rotateY: -8 }}
                            initial={{ scale: 0.7, opacity: 0, filter: 'blur(6px)' }}
                            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                            exit={{ scale: 0.7, opacity: 0, filter: 'blur(6px)' }}
                            transition={SPRING_EXPAND}
                            className="h-10 w-10 flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-[background-color] duration-150 select-none disabled:opacity-40 disabled:pointer-events-none rounded-full"
                          >
                            <SvgIcon svg={chevronLeftSvg} size={16} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <AnimatePresence initial={false}>
                        {canGoForward && (
                          <motion.button
                            key="forward"
                            onClick={handleGoForward}
                            aria-label="Go forward"
                            whileTap={{ scale: 0.82, x: 2, rotateY: 8 }}
                            initial={{ scale: 0.7, opacity: 0, filter: 'blur(6px)' }}
                            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                            exit={{ scale: 0.7, opacity: 0, filter: 'blur(6px)' }}
                            transition={SPRING_EXPAND}
                            className="h-10 w-10 rounded-full flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-[background-color] duration-150 select-none flex-shrink-0"
                          >
                            <SvgIcon svg={chevronRightSvg} size={16} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── URL Pod ── */}
                <div className="flex items-center rounded-full min-w-0 flex-shrink">
                  <URLBar onFocusChange={handleFocusChange} />
                </div>

                {/* ── Split Unsplit Button ── */}
                <AnimatePresence initial={false}>
                  {isSplit && (
                    <motion.div
                      key="unsplit-pod"
                      className="flex items-center rounded-full"
                      initial={{ width: 0, scale: 0.7, opacity: 0, filter: 'blur(6px)' }}
                      animate={{ width: 'auto', scale: 1, opacity: 1, filter: 'blur(0px)' }}
                      exit={{ width: 0, scale: 0.7, opacity: 0, filter: 'blur(6px)' }}
                      transition={SPRING_EXPAND}
                      style={{ overflow: 'hidden' }}
                    >
                      <motion.button
                        onClick={handleUnsplit}
                        aria-label="Exit split view"
                        whileTap={{ scale: 0.85 }}
                        initial={{ scale: 0.7, opacity: 0, filter: 'blur(6px)' }}
                        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                        exit={{ scale: 0.7, opacity: 0, filter: 'blur(6px)' }}
                        transition={SPRING_EXPAND}
                        className="h-10 w-10 rounded-full flex items-center justify-center text-blue-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-[background-color] duration-100 select-none"
                      >
                        <SvgIcon svg={unsplitSvg} size={15} />
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Download Pill (self-contained, already glass-styled) ── */}
                <DownloadPill />

                {/* ── Tab Pod ── */}
                <TabPill />
              </div>
            </div>

            {/* Split panel indicator dots */}
            <AnimatePresence>
              {isSplit && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={SPRING_SNAPPY}
                  className="absolute left-1/2 -translate-x-1/2 flex gap-2"
                  style={{ bottom: "100%", marginBottom: 6 }}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${focusedPanel === "primary" ? "bg-blue-500" : "bg-gray-300 dark:bg-neutral-600"}`}
                  />
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${focusedPanel === "split" ? "bg-blue-500" : "bg-gray-300 dark:bg-neutral-600"}`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </>
  );
}

export const FloatingControls = memo(FloatingControlsInner);
