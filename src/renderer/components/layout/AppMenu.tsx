import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useShallow } from 'zustand/react/shallow';
import { SvgIcon } from "@/components/ui/SvgIcon";
import homeSvg from "@/assets/icons/Interface/Home_2.svg?raw";
import bookmarkSvg from "@/assets/icons/Objects/Bookmark.svg?raw";
import counterclockwiseSvg from "@/assets/icons/Arrows/Counterclockwise.svg?raw";
import downloadSvg from "@/assets/icons/Objects/Tray_Arrow_Down.svg?raw";
import settingsSvg from "@/assets/icons/Objects/Settings.svg?raw";
import menuPointsSvg from "@/assets/icons/Interface/Menu_burger.svg?raw";
import closeSvg from "@/assets/icons/Interface/Close_Cross.svg?raw";
import searchSvg from "@/assets/icons/Objects/Search.svg?raw";
import plusSvg from "@/assets/icons/Maths/Plus.svg?raw";
import { CARDS_SVG } from "@/components/ui/SvgIcon";
import { useTabStore } from "@/store/tabStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import { normalizeURL, isValidHomepageUrl } from "@/utils/urlUtils";
import { SPRING_POPUP, SPRING_SNAPPY } from '@/utils/springs';

const menuItems = [
  { id: "new-tab", label: "New Tab", icon: plusSvg, shortcut: "Ctrl+T" },
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
  { id: "bookmarks", label: "Bookmarks", icon: bookmarkSvg, shortcut: "" },
  { id: "history", label: "History", icon: counterclockwiseSvg, shortcut: "" },
  { id: "downloads", label: "Downloads", icon: downloadSvg, shortcut: "" },
  { id: "divider3", label: "", icon: null, shortcut: "" },
  { id: "settings", label: "Settings", icon: settingsSvg, shortcut: "" },
] as const;

function AppMenuInner(): React.JSX.Element {
  const { isOpen, setMenuOpen, isSettingsOpen, isBookmarksOpen, isHistoryOpen, isDownloadsOpen } = useUIStore(useShallow((s) => ({
    isOpen: s.isMenuOpen,
    setMenuOpen: s.setMenuOpen,
    isSettingsOpen: s.isSettingsOpen,
    isBookmarksOpen: s.isBookmarksOpen,
    isHistoryOpen: s.isHistoryOpen,
    isDownloadsOpen: s.isDownloadsOpen,
  })));
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)
  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects)
  const isPanelOpen =
    isSettingsOpen ||
    isBookmarksOpen ||
    isHistoryOpen ||
    isDownloadsOpen;
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
        const homepageUrl = useSettingsStore.getState().homepageUrl?.trim() ?? "";
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
        useTabStore.getState().addTab();
      } else if (action === "bookmarks") {
        useUIStore.getState().toggleBookmarks();
      } else if (action === "history") {
        useUIStore.getState().toggleHistory();
      } else if (action === "downloads") {
        useUIStore.getState().toggleDownloads();
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
  const actionableItems = menuItems.filter((item) => !item.id.startsWith("divider"));

  return (
    <div className="relative">
      <motion.button
        onClick={handleToggle}
        aria-label="Menu"
        aria-expanded={isOpen}
        animate={{ scale: isOpen ? 0.92 : isPanelOpen ? 0.9 : 1 }}
        whileTap={{ scale: 0.82 }}
        transition={disableAnimations ? { duration: 0 } : SPRING_SNAPPY}
        className="h-10 w-10 rounded-full flex items-center justify-center text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-100 select-none"
      >
        <div className="relative w-[18px] h-[18px] flex items-center justify-center">
          <motion.span
            animate={{
              scale: isOpen ? 0 : 1,
              rotate: isOpen ? 90 : 0,
              opacity: isOpen ? 0 : 1,
            }}
            transition={SPRING_SNAPPY}
            className="absolute inset-0 flex items-center justify-center"
          >
            <SvgIcon svg={menuPointsSvg} size={18} />
          </motion.span>
          <motion.span
            animate={{
              scale: isOpen ? 1 : 0,
              rotate: isOpen ? 0 : -90,
              opacity: isOpen ? 1 : 0,
            }}
            transition={SPRING_SNAPPY}
            className="absolute inset-0 flex items-center justify-center"
          >
            <SvgIcon svg={closeSvg} size={18} />
          </motion.span>
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-away */}
            <div className="fixed inset-0 z-[99]" onMouseDown={handleClose} />
            <motion.div
              className="absolute bottom-full left-1/2 z-[100] min-w-[280px]"
              style={{ originX: 0.5, originY: 1, x: "-50%" }}
              initial={disableAnimations ? undefined : {
                scaleX: 0.15,
                scaleY: 0.04,
                opacity: 0,
                y: 10,
                borderRadius: 40,
                filter: disableBlurEffects ? 'none' : 'blur(6px)',
              }}
              animate={{
                scaleX: 1,
                scaleY: 1,
                opacity: 1,
                y: 0,
                borderRadius: 16,
                filter: disableBlurEffects ? 'none' : 'blur(0px)',
              }}
              exit={disableAnimations ? undefined : {
                scaleX: 0.15,
                scaleY: 0.04,
                opacity: 0,
                y: 10,
                borderRadius: 40,
                filter: disableBlurEffects ? 'none' : 'blur(6px)',
              }}
              transition={disableAnimations ? { duration: 0 } : {
                type: 'spring',
                stiffness: 380,
                damping: 28,
                mass: 0.6,
                opacity: { duration: 0.12 },
                filter: { duration: 0.2 },
              }}
            >
              <div className={`rounded-xl mb-2 drop-shadow-lg overflow-hidden ${disableBlurEffects ? 'bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10' : 'bg-white dark:bg-[#1D1F23] border border-black/5 dark:border-white/5'}`}>
                <div className="p-1 relative">
                  {actionableItems.map((item, idx) => {
                    const Icon = item.icon!;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMenuItemClick(item.id)}
                        className="w-full rounded-xl flex items-center gap-3 px-3.5 h-10 text-[13px] font-light text-gray-700 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-150 relative [app-region:no-drag]"
                        style={disableAnimations
                          ? { opacity: 1, animation: 'none' }
                          : {
                              opacity: 0,
                              animation: `menu-item-in 160ms ease-out ${50 + idx * 20}ms forwards`,
                            }}
                      >
                        <span className="relative flex items-center gap-3 w-full z-10">
                          <SvgIcon svg={Icon} size={16} />
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.shortcut && (
                            <span className="text-[11px] text-gray-400 dark:text-neutral-500">
                              {item.shortcut}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export const AppMenu = memo(AppMenuInner);
