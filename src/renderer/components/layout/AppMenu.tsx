import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/Button";
import { SvgIcon } from "@/components/ui/SvgIcon";

import homeSvg from "@/assets/icons/Interface/Home_2.svg?raw";
import bookmarkSvg from "@/assets/icons/Objects/Bookmark.svg?raw";
import counterclockwiseSvg from "@/assets/icons/Arrows/Counterclockwise.svg?raw";
import downloadSvg from "@/assets/icons/Objects/Tray_Arrow_Down.svg?raw";
import settingsSvg from "@/assets/icons/Objects/Settings.svg?raw";
import componentsSvg from "@/assets/icons/Objects/Wrench.svg?raw";
import menuPointsSvg from "@/assets/icons/Interface/Menu_burger.svg?raw";
import closeSvg from "@/assets/icons/Interface/Close_Cross.svg?raw";
import searchSvg from "@/assets/icons/Objects/Search.svg?raw";
import plusSvg from "@/assets/icons/Maths/Plus.svg?raw";
import privateSvg from "@/assets/icons/Interface/Private.svg?raw";

import { CARDS_SVG } from "@/components/ui/SvgIcon";

import { useTabStore } from "@/store/tabStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import { useFocusedTabIsPrivate } from "@/hooks/useTabSelector";

import { normalizeURL, isValidHomepageUrl } from "@/utils/urlUtils";
import { SPRING_POPUP, SPRING_SNAPPY } from "@/utils/springs";
import {
  clampPopoverLeft,
  clampPopoverTop,
  getPopoverMotion,
} from "@/utils/popoverPosition";

const MENU_WIDTH = 280;
const MENU_ESTIMATED_HEIGHT = 420;

const menuItems = [
  { id: "new-tab", label: "New Tab", icon: plusSvg, shortcut: "Ctrl+T" },
  { id: "private-mode", label: "Private mode", icon: privateSvg, shortcut: "Ctrl+Shift+N" },
  { id: "exit-private-mode", label: "Exit Private mode", icon: privateSvg, shortcut: "" },
  { id: "home", label: "Home", icon: homeSvg, shortcut: "" },
  { id: "divider", label: "", icon: null, shortcut: "" },
  { id: "find", label: "Find in Page", icon: searchSvg, shortcut: "Ctrl+F" },
  {
    id: "tab-overview",
    label: "Tab Overview",
    icon: CARDS_SVG,
    shortcut: "Ctrl+Shift+A",
  },
  { id: "divider2", label: "", icon: null, shortcut: "" },
  { id: "bookmarks", label: "Bookmarks", icon: bookmarkSvg, shortcut: "Ctrl+B" },
  { id: "history", label: "History", icon: counterclockwiseSvg, shortcut: "Ctrl+H" },
  { id: "downloads", label: "Downloads", icon: downloadSvg, shortcut: "" },
  { id: "ui-kit", label: "UI Kit", icon: componentsSvg, shortcut: "" },
  { id: "divider3", label: "", icon: null, shortcut: "" },
  { id: "settings", label: "Settings", icon: settingsSvg, shortcut: "Ctrl+," },
] as const;

function AppMenuInner(): React.JSX.Element {
  const {
    isOpen,
    setMenuOpen,
    isSettingsOpen,
    isBookmarksOpen,
    isHistoryOpen,
    isDownloadsOpen,
  } = useUIStore(
    useShallow((s) => ({
      isOpen: s.isMenuOpen,
      setMenuOpen: s.setMenuOpen,
      isSettingsOpen: s.isSettingsOpen,
      isBookmarksOpen: s.isBookmarksOpen,
      isHistoryOpen: s.isHistoryOpen,
      isDownloadsOpen: s.isDownloadsOpen,
    })),
  );

  const disableAnimations = useSettingsStore((s) => s.disableAnimations);
  const uiLayout = useSettingsStore((s) => s.uiLayout);
  const isPrivate = useFocusedTabIsPrivate();

  const popoverBelow = uiLayout === "classic";

  const { enterY, exitY } = getPopoverMotion(popoverBelow);

  const menuSurface =
    "bg-[var(--app-bg-secondary)] border border-[var(--app-separator)]";

  const triggerRef = useRef<HTMLDivElement>(null);

  const [menuPos, setMenuPos] = useState<{
    left: number;
    top: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setMenuPos(null);
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();

    if (!popoverBelow) {
      // Bottom toolbar layout: anchor above trigger
      const left = clampPopoverLeft(rect, MENU_WIDTH);
      const top = clampPopoverTop(rect, MENU_ESTIMATED_HEIGHT, popoverBelow);

      setMenuPos({ left, top });
    } else {
      // Classic top toolbar layout: pin to top-left corner
      setMenuPos({ left: 2, top: 42 });
    }
  }, [isOpen, popoverBelow]);

  const isPanelOpen =
    isSettingsOpen || isBookmarksOpen || isHistoryOpen || isDownloadsOpen;

  const handleToggle = useCallback(() => {
    setMenuOpen(!isOpen);
  }, [isOpen, setMenuOpen]);

  const handleClose = useCallback(() => {
    setMenuOpen(false);
  }, [setMenuOpen]);

  const handleMenuItemClick = useCallback(
    (action: string) => {
      if (action === "settings") {
        useUIStore.getState().toggleSettings();
      } else if (action === "home") {
        const tabStore = useTabStore.getState();
        const homepageUrl =
          useSettingsStore.getState().homepageUrl?.trim() ?? "";

        if (homepageUrl && isValidHomepageUrl(homepageUrl)) {
          const url = normalizeURL(homepageUrl);
          const activeId = tabStore.activeTabId;

          if (activeId && tabStore.tabs[activeId]) {
            tabStore.updateTab(activeId, { url });
          } else {
            tabStore.addTab(url);
          }
        } else {
          tabStore.addTab("browser://newtab");
        }
      } else if (action === "new-tab") {
        useTabStore.getState().addTabInCurrentContext();
      } else if (action === "private-mode") {
        useTabStore.getState().addPrivateTab();
      } else if (action === "exit-private-mode") {
        useTabStore.getState().exitPrivateMode();
      } else if (action === "bookmarks") {
        useUIStore.getState().toggleBookmarks();
      } else if (action === "history") {
        useUIStore.getState().toggleHistory();
      } else if (action === "downloads") {
        useUIStore.getState().toggleDownloads();
      } else if (action === "ui-kit") {
        const tabStore = useTabStore.getState();
        const activeId = tabStore.activeTabId;

        if (activeId && tabStore.tabs[activeId]) {
          tabStore.updateTab(activeId, {
            url: "browser://uikit",
            title: "UI Kit",
          });
        } else {
          tabStore.addTab("browser://uikit");
        }
      } else if (action === "find") {
        useUIStore.getState().toggleFindBar();
      } else if (action === "tab-overview") {
        useUIStore.getState().toggleTabOverview();
      }

      handleClose();
    },
    [handleClose],
  );

  // Filter dividers so hover index tracking is safe across re-renders
  const actionableItems = menuItems.filter(
    (item) =>
      !item.id.startsWith("divider") &&
      (isPrivate || item.id !== "exit-private-mode"),
  );

  return (
    <div className={`relative ${popoverBelow ? "" : "h-full"}`} ref={triggerRef}>
      <Button
        variant="ghost"
        size="none"
        onClick={handleToggle}
        aria-label="Menu"
        aria-expanded={isOpen}
        animate={{ scale: isOpen ? 0.92 : isPanelOpen ? 0.9 : 1 }}
        whileTap={{ scale: 0.82 }}
        transition={disableAnimations ? { duration: 0 } : SPRING_SNAPPY}
        className={`${
          popoverBelow ? "h-9 w-9" : "h-full aspect-square"
        } rounded-lg flex items-center justify-center transition-colors duration-100 select-none`}
      >
        <div className="relative w-[18px] h-[18px] flex items-center justify-center">
          <m.span
            animate={{
              scale: isOpen ? 0 : 1,
              rotate: isOpen ? 90 : 0,
              opacity: isOpen ? 0 : 1,
            }}
            transition={SPRING_SNAPPY}
            className="absolute inset-0 flex items-center justify-center"
          >
            <SvgIcon svg={menuPointsSvg} size={18} />
          </m.span>

          <m.span
            animate={{
              scale: isOpen ? 1 : 0,
              rotate: isOpen ? 0 : -90,
              opacity: isOpen ? 1 : 0,
            }}
            transition={SPRING_SNAPPY}
            className="absolute inset-0 flex items-center justify-center"
          >
            <SvgIcon svg={closeSvg} size={18} />
          </m.span>
        </div>
      </Button>

      <AnimatePresence>
        {isOpen && menuPos && (
          <>
            {/* Click-away */}
            <div className="fixed inset-0 z-[99]" onMouseDown={handleClose} />

            <m.div
              className={`${
                popoverBelow
                  ? "fixed"
                  : "absolute left-1/2 bottom-full mb-2 -translate-x-1/2"
              } z-[100]`}
              style={
                popoverBelow
                  ? {
                      left: menuPos.left,
                      top: menuPos.top,
                      width: MENU_WIDTH,
                      originX: 0.5,
                      originY: 0,
                    }
                  : {
                      width: MENU_WIDTH,
                      originX: 0.5,
                      originY: 1,
                    }
              }
              initial={
                disableAnimations
                  ? undefined
                  : {
                      scaleX: 0.15,
                      scaleY: 0.04,
                      opacity: 0,
                      y: enterY,
                      borderRadius: 40,
                    }
              }
              animate={{
                scaleX: 1,
                scaleY: 1,
                opacity: 1,
                y: 0,
                borderRadius: 16,
              }}
              exit={
                disableAnimations
                  ? undefined
                  : {
                      scaleX: 0.15,
                      scaleY: 0.04,
                      opacity: 0,
                      y: exitY,
                      borderRadius: 40,
                    }
              }
              transition={
                disableAnimations
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 380,
                      damping: 28,
                      mass: 0.6,
                      opacity: { duration: 0.12 },
                    }
              }
            >
              <div
                className={`rounded-xl shadow-sm overflow-hidden ${
                  popoverBelow ? "mt-10" : "mb-2"
                } ${menuSurface}`}
              >
                <div className="p-1 relative">
                  {actionableItems.map((item, idx) => {
                    const Icon = item.icon!;

                    return (
                      <Button
                        variant="ghost"
                        size="none"
                        key={item.id}
                        onClick={() => handleMenuItemClick(item.id)}
                        className="relative h-10 w-full justify-start gap-3 rounded-lg px-3.5 text-[13px] font-light [app-region:no-drag]"
                        style={
                          disableAnimations
                            ? { opacity: 1, animation: "none" }
                            : {
                                opacity: 0,
                                animation: `menu-item-in 160ms ease-out ${
                                  50 + idx * 20
                                }ms forwards`,
                              }
                        }
                      >
                        <span className="relative flex items-center gap-3 w-full z-10">
                          <SvgIcon svg={Icon} size={16} />
                          <span className="flex-1 text-left">{item.label}</span>

                          {item.shortcut && (
                            <span className="text-[11px] text-[var(--app-text-tertiary)]">
                              {item.shortcut}
                            </span>
                          )}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export const AppMenu = memo(AppMenuInner);
