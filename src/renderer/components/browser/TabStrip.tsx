import { memo, useCallback, useEffect, useRef, useState } from "react";

import { m, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/Button";

import { SvgIcon, SPINNER_SVG } from "@/components/ui/SvgIcon";

import plusSvg from "@/assets/icons/Maths/Plus.svg?raw";

import closeSvg from "@/assets/icons/Interface/Close_Cross.svg?raw";

import globeSvg from "@/assets/icons/Nature/Globe_fill.svg?raw";
import newTabFavicon from "@/assets/icons/Interface/Dott.svg";

import tabsSvg from "@/assets/icons/Interface/Tabs.svg?raw";

import soundFillSvg from "@/assets/icons/Objects/Sound_Wave_2_Fill.svg?raw";

import soundMuteSvg from "@/assets/icons/Objects/Sound_Mute.svg?raw";

import pinFillSvg from "@/assets/icons/Objects/Pin_Fill.svg?raw";

import splitSvg from "@/assets/icons/Arrows/Triangle_Branch.svg?raw";

import unsplitSvg from "@/assets/icons/Arrows/Triangle_Merge.svg?raw";

import {
  useActiveTabId,
  useSplitTabId,
  useIsSplitView,
  useTabMeta,
  useSpaceTabOrder,
  useBackgroundMediaPlaying,
} from "@/hooks/useTabSelector";

import { useTabStore } from "@/store/tabStore";

import { useUIStore } from "@/store/uiStore";

import { useSettingsStore } from "@/store/settingsStore";

import { TabContextMenu, TabRow } from "@/components/browser/TabPill";

import { SPRING_POPUP } from "@/utils/springs";

const TAB_MIN_WIDTH = 40;

const TAB_MAX_WIDTH = 220;

const TAB_COMPACT_WIDTH = 72;

const TabStripItem = memo(function TabStripItem({
  tabId,

  isActive,

  isSplitTarget,

  isSplit,

  tabWidth,

  compactMode,

  onContextMenu,
}: {
  tabId: string;

  isActive: boolean;

  isSplitTarget: boolean;

  isSplit: boolean;

  tabWidth: number;

  compactMode: "full" | "compact" | "icon";

  onContextMenu: (e: React.MouseEvent) => void;
}): React.JSX.Element {
  const meta = useTabMeta(tabId);

  const setActiveTab = useTabStore((s) => s.setActiveTab);

  const removeTab = useTabStore((s) => s.removeTab);

  const splitTab = useTabStore((s) => s.splitTab);

  const unsplit = useTabStore((s) => s.unsplit);

  const toggleMute = useTabStore((s) => s.toggleMute);

  const title = meta?.title ?? "New Tab";

  const favicon = meta?.favicon;
  const isNewTabFavicon = favicon === newTabFavicon;

  const isLoading = meta?.isLoading ?? false;

  const isPlayingMedia = meta?.isPlayingMedia ?? false;

  const isMuted = meta?.isMuted ?? false;

  const pinned = meta?.pinned ?? false;

  const isHighlighted = isActive || isSplitTarget;

  const showTitle = compactMode === "full";

  const showActions = compactMode !== "icon";

  const handleClick = useCallback(() => {
    setActiveTab(tabId);
  }, [tabId, setActiveTab]);

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!pinned) removeTab(tabId);
    },

    [tabId, removeTab, pinned],
  );

  const handleSplit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (isSplitTarget) {
        unsplit();
      } else {
        splitTab(tabId);
      }
    },

    [tabId, splitTab, unsplit, isSplitTarget],
  );

  return (
    <Button
      variant="ghost"
      size="none"
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();

        onContextMenu(e);
      }}
      style={{
        width: tabWidth,
        flexBasis: tabWidth,
        flexShrink: 1,
        minWidth: TAB_MIN_WIDTH,
        maxWidth: TAB_MAX_WIDTH,
      }}
      title={compactMode !== "full" ? title : undefined}
      className={`group relative flex h-8 items-center overflow-hidden rounded-lg text-left transition-colors duration-100 flex-shrink [app-region:no-drag] ${
        compactMode === "icon"
          ? "justify-center px-1 gap-0"
          : compactMode === "compact"
            ? "px-2 gap-1.5"
            : "px-3 gap-2"
      } ${
        isHighlighted
          ? "!bg-[var(--app-bg-quaternary)] !text-[var(--app-text-primary)]"
          : "bg-transparent hover:bg-[var(--app-bg-quaternary)] hover:text-[var(--app-text-secondary)]"
      }`}
    >
      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
        {isLoading ? (
          <SvgIcon
            svg={SPINNER_SVG}
            size={14}
            className="animate-spin text-gray-400"
          />
        ) : favicon ? (
          <img
            src={favicon}
            alt=""
            className={`w-3.5 h-3.5 rounded-sm ${isNewTabFavicon ? "dark:invert" : ""}`}
            draggable={false}
          />
        ) : (
          <SvgIcon svg={globeSvg} size={14} className="text-gray-400" />
        )}
      </div>

      {showTitle && (
        <span className="flex-1 min-w-0 text-[12px] truncate">{title}</span>
      )}

      {showActions && isSplitTarget && (
        <SvgIcon
          svg={splitSvg}
          size={10}
          className="flex-shrink-0 text-blue-500"
        />
      )}

      {showActions && (isPlayingMedia || isMuted) && (
        <div
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full cursor-pointer text-blue-500 hover:text-blue-600"
          onClick={(e) => {
            e.stopPropagation();

            toggleMute(tabId);
          }}
          title={isMuted ? "Unmute tab" : "Mute tab"}
        >
          <SvgIcon svg={isMuted ? soundMuteSvg : soundFillSvg} size={11} />
        </div>
      )}

      {showActions && pinned && (
        <SvgIcon
          svg={pinFillSvg}
          size={9}
          className="flex-shrink-0 text-amber-500 opacity-70"
        />
      )}

      {showActions && !isActive && (
        <div
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:text-blue-500"
          onClick={handleSplit}
          title={
            isSplitTarget ? "Unsplit" : isSplit ? "Replace split" : "Split view"
          }
        >
          <SvgIcon svg={isSplitTarget ? unsplitSvg : splitSvg} size={10} />
        </div>
      )}

      {showActions && (
        <div
          className={`flex-shrink-0 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity ${
            pinned
              ? "text-gray-300 cursor-not-allowed"
              : "text-[var(--app-text-primary)] hover:bg-[var(--app-bg-secondary)]"
          }`}
          onClick={pinned ? undefined : handleClose}
          title={pinned ? "Unpin to close" : "Close tab"}
        >
          <SvgIcon svg={closeSvg} size={10} />
        </div>
      )}
    </Button>
  );
});

function TabStripInner(): React.JSX.Element {
  const tabOrder = useSpaceTabOrder();

  const activeTabId = useActiveTabId();

  const splitTabId = useSplitTabId();

  const isSplit = useIsSplitView();

  const addTab = useTabStore((s) => s.addTab);

  const bgMediaPlaying = useBackgroundMediaPlaying();

  const tabsButtonAction = useSettingsStore((s) => s.tabsButtonAction);

  const disableAnimations = useSettingsStore((s) => s.disableAnimations);

  const menuOpen = useUIStore((s) => s.isTabStripMenuOpen);

  const setTabStripMenuOpen = useUIStore((s) => s.setTabStripMenuOpen);

  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState(0);

  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const el = tabsContainerRef.current;

    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (entry) setContainerWidth(entry.contentRect.width);
    });

    observer.observe(el);

    setContainerWidth(el.clientWidth);

    return () => observer.disconnect();
  }, []);

  const tabCount = tabOrder.length;

  const tabWidth =
    tabCount > 0
      ? Math.max(
          TAB_MIN_WIDTH,
          Math.min(TAB_MAX_WIDTH, containerWidth / tabCount),
        )
      : TAB_MAX_WIDTH;

  const compactMode: "full" | "compact" | "icon" =
    tabWidth < TAB_MIN_WIDTH + 4
      ? "icon"
      : tabWidth < TAB_COMPACT_WIDTH
        ? "compact"
        : "full";

  const handleAddTab = useCallback(() => addTab(), [addTab]);

  const handleTabOverview = useCallback(() => {
    if (tabsButtonAction === "menu") {
      setTabStripMenuOpen(!menuOpen);
    } else {
      useUIStore.getState().toggleTabOverview();
    }
  }, [tabsButtonAction, menuOpen, setTabStripMenuOpen]);

  const handleCloseMenu = useCallback(() => {
    setTabStripMenuOpen(false);
  }, [setTabStripMenuOpen]);

  return (
  <div className="flex items-center flex-1 min-w-0 gap-1 [app-region:drag]">
  <div
    ref={tabsContainerRef}
    className="flex items-center flex-1 min-w-0 gap-0.5 overflow-hidden"
  >
    {tabOrder.map((id) => (
      <TabStripItem
        key={id}
        tabId={id}
        isActive={id === activeTabId}
        isSplitTarget={id === splitTabId}
        isSplit={isSplit}
        tabWidth={tabWidth}
        compactMode={compactMode}
        onContextMenu={(e) =>
          setContextMenu({ tabId: id, x: e.clientX, y: e.clientY })
        }
      />
    ))}

    {/* Inside the container so it follows the last tab naturally */}
    <Button
      variant="icon"
      size="icon-md"
      rounded="rounded-md"
      onClick={handleAddTab}
      aria-label="New tab"
      className="!h-8 w-8 flex-shrink-0 [app-region:no-drag]"
    >
      <SvgIcon svg={plusSvg} size={14} />
    </Button>
  </div>


    <div className="relative z-10">
      <AnimatePresence>
        {menuOpen && tabsButtonAction === "menu" && (
          <m.div
            className="absolute top-full right-0 z-[100] min-w-[230px] max-w-[290px] mt-1"
            initial={
              disableAnimations
                ? undefined
                : { opacity: 0, y: -6, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              disableAnimations
                ? undefined
                : { opacity: 0, y: -6, scale: 0.96 }
            }
            transition={disableAnimations ? { duration: 0 } : SPRING_POPUP}
          >
            <div
              className="rounded-xl shadow-sm overflow-hidden bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)] text-[var(--app-text-primary)]"
            >
              <div className="p-1 max-h-[320px] overflow-y-auto flex flex-col gap-1 scrollbar-none">
                {tabOrder.map((id, index) => (
                  <TabRow
                    key={id}
                    tabId={id}
                    isActive={id === activeTabId}
                    isSplitTarget={id === splitTabId}
                    isSplit={isSplit}
                    index={index}
                    onSelect={handleCloseMenu}
                    onContextMenu={(e) =>
                      setContextMenu({
                        tabId: id,
                        x: e.clientX,
                        y: e.clientY,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>

    {contextMenu && (
      <TabContextMenu
        tabId={contextMenu.tabId}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu(null)}
      />
    )}
  </div>
);
}

export const TabStrip = memo(TabStripInner);
