import { memo, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
import filtrSvg from "@/assets/icons/Interface/Filtr.svg?raw";
import keyboardSvg from "@/assets/icons/Keyboard/Keyboard.svg?raw";
import { useTabStore } from "@/store/tabStore";
import { useUIStore } from "@/store/uiStore";
import { SPRING_POPUP, SPRING_SNAPPY } from '@/utils/springs';

const menuItems = [
  { id: "new-tab", label: "New Tab", icon: plusSvg, shortcut: "Ctrl+T" },
  { id: "home", label: "Home", icon: homeSvg, shortcut: "" },
  { id: "divider", label: "", icon: null, shortcut: "" },
  { id: "find", label: "Find in Page", icon: searchSvg, shortcut: "Ctrl+F" },
  {
    id: "tab-overview",
    label: "Tab Overview",
    icon: filtrSvg,
    shortcut: "Ctrl+Shift+A",
  },
  { id: "divider2", label: "", icon: null, shortcut: "" },
  { id: "bookmarks", label: "Bookmarks", icon: bookmarkSvg, shortcut: "" },
  { id: "history", label: "History", icon: counterclockwiseSvg, shortcut: "" },
  { id: "downloads", label: "Downloads", icon: downloadSvg, shortcut: "" },
  { id: "divider3", label: "", icon: null, shortcut: "" },
  {
    id: "hotkeys",
    label: "Keyboard Shortcuts",
    icon: keyboardSvg,
    shortcut: "",
  },
  { id: "settings", label: "Settings", icon: settingsSvg, shortcut: "" },
] as const;

function AppMenuInner(): React.JSX.Element {
  const isOpen = useUIStore((s) => s.isMenuOpen);
  const setMenuOpen = useUIStore((s) => s.setMenuOpen);
  const isSettingsOpen = useUIStore((s) => s.isSettingsOpen);
  const isBookmarksOpen = useUIStore((s) => s.isBookmarksOpen);
  const isHistoryOpen = useUIStore((s) => s.isHistoryOpen);
  const isDownloadsOpen = useUIStore((s) => s.isDownloadsOpen);
  const isHotkeysOpen = useUIStore((s) => s.isHotkeysOpen);
  const isPanelOpen =
    isSettingsOpen ||
    isBookmarksOpen ||
    isHistoryOpen ||
    isDownloadsOpen ||
    isHotkeysOpen;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const handleToggle = useCallback(() => {
    setMenuOpen(!isOpen);
  }, [isOpen, setMenuOpen]);

  const handleClose = useCallback(() => {
    setMenuOpen(false);
    setHoveredIdx(null);
  }, [setMenuOpen]);

  const handleMenuItemClick = useCallback(
    (action: string) => {
      if (action === "settings") {
        useUIStore.getState().toggleSettings();
      } else if (action === "home") {
        useTabStore.getState().addTab("browser://newtab");
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
      } else if (action === "hotkeys") {
        useUIStore.getState().toggleHotkeys();
      }
      handleClose();
    },
    [handleClose],
  );

  // Count actionable (non-divider) items for hover index tracking
  let actionableIdx = -1;

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        onClick={handleToggle}
        aria-label="Menu"
        aria-expanded={isOpen}
        animate={{ scale: isOpen ? 0.92 : isPanelOpen ? 0.9 : 1 }}
        whileTap={{ scale: 0.82 }}
        transition={SPRING_SNAPPY}
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
              className="absolute bottom-full mb-2 left-1/2 z-[100] min-w-[260px]"
              style={{ originX: 0.5, originY: 1, x: "-50%", perspective: 600 }}
              initial={{
                scaleX: 0.3,
                scaleY: 0.08,
                opacity: 0,
                y: 32,
                rotateX: -16,
              }}
              animate={{ scaleX: 1, scaleY: 1, opacity: 1, y: 0, rotateX: 0 }}
              exit={{
                scaleX: 0.3,
                scaleY: 0.06,
                opacity: 0,
                y: 28,
                rotateX: -10,
              }}
              transition={{ ...SPRING_POPUP, opacity: { duration: 0.1 } }}
            >
              <div className="rounded-2xl glass-heavy overflow-hidden">
                <div className="p-1 relative">
                  {menuItems.map((item, idx) => {
                    if (item.id.startsWith("divider")) {
                      return (
                        <div
                          key={item.id}
                          className="border-t border-[var(--border-divider)] my-1"
                        />
                      );
                    }

                    actionableIdx++;
                    const thisIdx = actionableIdx;
                    const Icon = item.icon!;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMenuItemClick(item.id)}
                        onMouseEnter={() => setHoveredIdx(thisIdx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        className="w-full rounded-xl flex items-center gap-3 px-3.5 h-9 text-[13px] font-light text-gray-700 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white active:scale-[0.97] transition-colors duration-75 relative [app-region:no-drag]"
                        style={{
                          opacity: 0,
                          animation: `menu-item-in 160ms ease-out ${50 + idx * 20}ms forwards`,
                        }}
                      >
                        {/* Sliding hover highlight */}
                        {hoveredIdx === thisIdx && (
                          <motion.div
                            layoutId="menu-highlight"
                            className="absolute inset-0 rounded-xl bg-black/[0.04] dark:bg-white/[0.06]"
                            transition={SPRING_SNAPPY}
                          />
                        )}
                        <span className="relative flex items-center gap-3 w-full">
                          <SvgIcon svg={Icon} size={16} />
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.shortcut && (
                            <span className="text-[11px] text-gray-400 dark:text-neutral-500 bg-black/[0.04] dark:bg-white/[0.06] rounded px-1.5 py-0.5 ml-2">
                              {item.shortcut}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Glass arrow pointer */}
              <div className="flex justify-center -mt-[1px] relative z-10">
                <svg
                  width="18"
                  height="9"
                  viewBox="0 0 18 9"
                  className="drop-shadow-sm"
                >
                  <path d="M0,0 C4.5,0 5.5,7 9,7 C12.5,7 13.5,0 18,0" fill="none" className="stroke-[var(--border-subtle)]" strokeWidth="1" />
                  <path d="M0,0 C4.5,0 5.5,7 9,7 C12.5,7 13.5,0 18,0 Z" style={{ fill: 'var(--glass-bg-heavy)' }} />
                </svg>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export const AppMenu = memo(AppMenuInner);
