// ─── Settings Panel ──────────────────────────────────────────────────────────
// Shell component: sidebar navigation + content router.
// All panes are extracted to src/renderer/settings/panes/ for maintainability.

import { memo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PanelModal } from "@/components/ui/PanelModal";
import { SvgIcon } from "@/components/ui/SvgIcon";
import closeSvg from "@/assets/icons/Interface/Close_Cross.svg?raw";
import settingsSvg from "@/assets/icons/Objects/Settings.svg?raw";
import brushSvg from "@/assets/icons/News/Camera_Macro.svg?raw";
import cameraSvg from "@/assets/icons/News/Image_picture.svg?raw";
import displaySvg from "@/assets/icons/Devices/Display.svg?raw";
import shieldSvg from "@/assets/icons/Objects/Shield.svg?raw";
import searchSvg from "@/assets/icons/Objects/Search.svg?raw";
import infoSvg from "@/assets/icons/Interface/Warn_Info.svg?raw";
import keyboardSvg from "@/assets/icons/Keyboard/Keyboard.svg?raw";
import gestureSvg from "@/assets/icons/Keyboard/TrackPad.svg?raw";
import { useUIStore } from "@/store/uiStore";
import { GeneralPane } from "@/settings/panes/GeneralPane";
import { AppearancePane } from "@/settings/panes/AppearancePane";
import { WallpaperPane } from "@/settings/panes/WallpaperPane";
import { PrivacyPane } from "@/settings/panes/PrivacyPane";
import { SearchEnginePane } from "@/settings/panes/SearchEnginePane";
import { HotkeysPane } from "@/settings/panes/HotkeysPane";
import { GesturesPane } from "@/settings/panes/GesturesPane";
import { GraphicsPane } from "./panes/GraphicsPane";
import { AboutPane } from "@/settings/panes/AboutPane";
import { SPRING_CONTENT, SPRING_SNAPPY } from "@/utils/springs";

// --- Sidebar Categories -------------------------------------------------------

type SettingsCategory =
  | "general"
  | "appearance"
  | "wallpaper"
  | "graphics"
  | "privacy"
  | "search"
  | "hotkeys"
  | "gestures"
  | "about";

interface CategoryItem {
  id: SettingsCategory;
  label: string;
  icon: string;
  colorClass: string;
}

const CATEGORIES: CategoryItem[] = [
  { id: "general", label: "General", icon: settingsSvg, colorClass: "bg-gray-500 text-white dark:bg-gray-600 dark:text-white" },
  { id: "appearance", label: "Appearance", icon: brushSvg, colorClass: "bg-black text-white dark:bg-white dark:text-black" },
  { id: "wallpaper", label: "Wallpaper", icon: cameraSvg, colorClass: "bg-purple-500 text-white dark:bg-purple-600 dark:text-white" },
  { id: "graphics", label: "Graphics", icon: displaySvg, colorClass: "bg-sky-500 text-white dark:bg-sky-600 dark:text-white" },
  { id: "privacy", label: "Privacy", icon: shieldSvg, colorClass: "bg-emerald-500 text-white dark:bg-emerald-600 dark:text-white" },
  { id: "search", label: "Search Engine", icon: searchSvg, colorClass: "bg-blue-500 text-white dark:bg-blue-600 dark:text-white" },
  { id: "hotkeys", label: "Shortcuts", icon: keyboardSvg, colorClass: "bg-gray-500 text-white dark:bg-gray-600 dark:text-white" },
  { id: "gestures", label: "Gestures", icon: gestureSvg, colorClass: "bg-gray-500 text-white dark:bg-gray-600 dark:text-white" },
  { id: "about", label: "About", icon: infoSvg, colorClass: "bg-gray-500 text-white dark:bg-gray-600 dark:text-white" },
];

// --- Content Pane Router ------------------------------------------------------

function SettingsContent({
  category,
}: {
  category: SettingsCategory;
}): React.JSX.Element {
  switch (category) {
    case "general":
      return <GeneralPane />;
    case "appearance":
      return <AppearancePane />;
    case "wallpaper":
      return <WallpaperPane />;
    case "graphics":
      return <GraphicsPane />;
    case "privacy":
      return <PrivacyPane />;
    case "search":
      return <SearchEnginePane />;
    case "hotkeys":
      return <HotkeysPane />;
    case "gestures":
      return <GesturesPane />;
    case "about":
      return <AboutPane />;
  }
}

// --- Sidebar ------------------------------------------------------------------

function Sidebar({
  activeCategory,
  onSelect,
}: {
  activeCategory: SettingsCategory;
  onSelect: (id: SettingsCategory) => void;
}): React.JSX.Element {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  return (
    <nav aria-label="Settings categories" className="flex flex-col gap-1">
      {CATEGORIES.map(({ id, label, icon, colorClass }, idx) => {
        const isActive = activeCategory === id
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex items-center gap-2.5 p-2 rounded-xl text-[13px] font-normal transition-all duration-150 ${isActive
              ? "text-gray-900 dark:text-white bg-black/[0.08] dark:bg-white/[0.10]"
              : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              }`}
          >
            <span className="relative flex items-center gap-3 z-10 w-full">
              <div className={`w-7 h-7 flex items-center justify-center rounded-full shrink-0 ${colorClass}`}>
                <SvgIcon svg={icon} size={16} />
              </div>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

// --- Main Panel ---------------------------------------------------------------

function SettingsPanelInner(): React.JSX.Element {
  const closeSettings = useUIStore((s) => s.closeSettings);
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>("general");

  const categoryLabel =
    CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "";

  return (
    <PanelModal
      onClose={closeSettings}
      width="720px"
      height="500px"
      role="dialog"
      aria-label="Settings"
      aria-modal={true}
    >

      <div className="flex h-full overflow-hidden">
        <div className="flex-shrink-0 h-full">
          <div className="w-[180px] h-full bg-white dark:bg-white/5 flex flex-col overflow-hidden" style={{ borderRight: '1px solid var(--border-subtle)' }}>
            <div className="px-4 pt-5 pb-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-500">
                Settings
              </h2>
            </div>
            <div className="flex-1 px-1.5 pb-4">
              <Sidebar
                activeCategory={activeCategory}
                onSelect={setActiveCategory}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <AnimatePresence mode="wait">
              <motion.h3
                key={activeCategory}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={SPRING_CONTENT}
                className="text-[15px] font-medium text-gray-900 dark:text-white tracking-relaxed"
              >
                {categoryLabel}
              </motion.h3>
            </AnimatePresence>
            <motion.button
              onClick={closeSettings}
              aria-label="Close settings"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              transition={SPRING_SNAPPY}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-150"
            >
              <SvgIcon svg={closeSvg} size={13} />
            </motion.button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 glass-scroll">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={SPRING_CONTENT}
              >
                <SettingsContent category={activeCategory} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PanelModal>
  );
}

export const SettingsPanel = memo(SettingsPanelInner);
