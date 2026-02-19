import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  useFocusedTabId,
  useFocusedTabNavState,
  useIsSplitView,
} from "@/hooks/useTabSelector";
import { SvgIcon } from "@/components/ui/SvgIcon";
import chevronLeftSvg from "@/assets/icons/Arrows/Chevron_Left.svg?raw";
import chevronRightSvg from "@/assets/icons/Arrows/Chevron_Right.svg?raw";
import unsplitSvg from "@/assets/icons/Arrows/Triangle_Merge.svg?raw";
import { webviewRegistry } from "@/webview/webviewRegistry";
import { URLBar } from "@/components/browser/URLBar";
import { AppMenu } from "@/components/layout/AppMenu";
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

  const resetTimer = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setIsIdle(true), autoHideDelay);
  }, [autoHideDelay]);

  useEffect(() => {
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
  }, [isActive, resetTimer]);

  return isIdle;
}

function FloatingControlsInner(): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const {
    isSettingsOpen,
    isBookmarksOpen,
    isHistoryOpen,
    isDownloadsOpen,
    isTabOverviewOpen,
    isDropdownOpen,
    isMenuOpen,
    isHotkeysOpen,
  } = useUIStore(
    useShallow((s) => ({
      isSettingsOpen: s.isSettingsOpen,
      isBookmarksOpen: s.isBookmarksOpen,
      isHistoryOpen: s.isHistoryOpen,
      isDownloadsOpen: s.isDownloadsOpen,
      isTabOverviewOpen: s.isTabOverviewOpen,
      isDropdownOpen: s.isDropdownOpen,
      isMenuOpen: s.isMenuOpen,
      isHotkeysOpen: s.isHotkeysOpen,
    }))
  );

  const tabId = useFocusedTabId();
  const { canGoBack, canGoForward } = useFocusedTabNavState();
  const isSplit = useIsSplitView();
  const focusedPanel = useTabStore((s) => s.focusedPanel);

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
    isHotkeysOpen;
  const isIdle = useIdleVisibility(isActive);

  // Close transient popups when UI goes idle (but NOT full panels like settings/bookmarks/history/downloads)
  useEffect(() => {
    if (isIdle) {
      const store = useUIStore.getState();
      if (store.isDropdownOpen) store.setDropdownOpen(false);
      if (store.isMenuOpen) store.setMenuOpen(false);
    }
  }, [isIdle]);

  const handleFocusChange = useCallback((focused: boolean) => {
    setIsInputFocused(focused);
  }, []);

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
      {/* Bottom-edge hover zone to reveal floating UI */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-5 z-[49] [app-region:no-drag]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <motion.div
        className="fixed bottom-5 left-1/2 z-50 [app-region:no-drag] floating-controls-bar"
        style={{ pointerEvents: isIdle ? "none" : "auto" }}
        initial={{ x: "-50%", y: 40, scale: 0.85, opacity: 0, filter: "blur(6px)" }}
        animate={
          isIdle
            ? { x: "-50%", y: 20, scale: 0.92, opacity: 0, filter: "blur(6px)" }
            : { x: "-50%", y: 0, scale: 1, opacity: 1, filter: "blur(0px)" }
        }
        transition={isIdle ? SPRING_GENTLE : SPRING}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Unified glass bar — single frosted surface with internal dividers */}
        <div className="flex items-center glass rounded-full p-1 gap-0.5">
          {/* Menu */}
          <AppMenu />

          {/* Divider */}
          <div className="w-px h-5 bg-[var(--border-divider)] flex-shrink-0" />

          {/* Nav Pod */}
          <AnimatePresence initial={false}>
            {(canGoBack || canGoForward) && (
              <motion.div
                key="nav-pod"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ ...SPRING_EXPAND, opacity: { duration: 0.15 } }}
                className="flex-shrink-0 overflow-hidden"
              >
                <div className="flex items-center">
                  <motion.button
                    onClick={handleGoBack}
                    disabled={!canGoBack}
                    aria-label="Go back"
                    whileTap={{ scale: 0.82, x: -2, rotateY: -8 }}
                    transition={SPRING_SNAPPY}
                    className="h-10 w-10 flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-[background-color] duration-150 select-none disabled:opacity-40 disabled:pointer-events-none rounded-full"
                  >
                    <SvgIcon svg={chevronLeftSvg} size={16} />
                  </motion.button>

                  <AnimatePresence initial={false}>
                    {canGoForward && (
                      <motion.div
                        key="forward"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{
                          ...SPRING_EXPAND,
                          opacity: { duration: 0.12 },
                        }}
                        className="flex items-center overflow-hidden"
                        style={{ flexShrink: 0 }}
                      >
                        <motion.button
                          onClick={handleGoForward}
                          aria-label="Go forward"
                          whileTap={{ scale: 0.82, x: 2, rotateY: 8 }}
                          transition={SPRING_SNAPPY}
                          className="h-10 w-10 rounded-full flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-[background-color] duration-150 select-none flex-shrink-0"
                        >
                          <SvgIcon svg={chevronRightSvg} size={16} />
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider — only when nav is visible */}
          <AnimatePresence initial={false}>
            {(canGoBack || canGoForward) && (
              <motion.div
                key="nav-divider"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-px h-5 bg-[var(--border-divider)] flex-shrink-0"
              />
            )}
          </AnimatePresence>

          {/* URL Pod */}
          <URLBar onFocusChange={handleFocusChange} />

          {/* Divider */}
          <div className="w-px h-5 bg-[var(--border-divider)] flex-shrink-0" />

          {/* Split indicator */}
          <AnimatePresence initial={false}>
            {isSplit && (
              <motion.div
                key="unsplit-slot"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 40, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={SPRING_EXPAND}
                style={{
                  flexShrink: 0,
                  clipPath: "inset(-12px -12px -12px -12px)",
                }}
              >
                <motion.button
                  onClick={handleUnsplit}
                  aria-label="Exit split view"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  whileTap={{ scale: 0.85 }}
                  transition={SPRING_SNAPPY}
                  className="h-10 w-10 rounded-full flex items-center justify-center text-indigo-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-[background-color] duration-100 select-none"
                >
                  <SvgIcon svg={unsplitSvg} size={15} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Download Pill */}
          <DownloadPill />

          {/* Tab Pod */}
          <TabPill />
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
              style={{ top: "100%", marginTop: 6 }}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${focusedPanel === "primary" ? "bg-indigo-500" : "bg-gray-300 dark:bg-neutral-600"}`}
              />
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${focusedPanel === "split" ? "bg-indigo-500" : "bg-gray-300 dark:bg-neutral-600"}`}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

export const FloatingControls = memo(FloatingControlsInner);
