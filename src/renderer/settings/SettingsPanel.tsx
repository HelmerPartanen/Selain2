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
import displaySvg from "@/assets/icons/Human/Person_Circle.svg?raw";
import shieldSvg from "@/assets/icons/Objects/Shield.svg?raw";
import searchSvg from "@/assets/icons/Objects/Search.svg?raw";
import infoSvg from "@/assets/icons/Interface/Warn_Info.svg?raw";
import keyboardSvg from "@/assets/icons/Keyboard/Keyboard.svg?raw";
import gestureSvg from "@/assets/icons/Human/Finger_Tap.svg?raw";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import { GeneralPane } from "@/settings/panes/GeneralPane";
import { AppearancePane } from "@/settings/panes/AppearancePane";
import { WallpaperPane } from "@/settings/panes/WallpaperPane";
import { PrivacyPane } from "@/settings/panes/PrivacyPane";
import { SearchEnginePane } from "@/settings/panes/SearchEnginePane";
import { HotkeysPane } from "@/settings/panes/HotkeysPane";
import { GesturesPane } from "@/settings/panes/GesturesPane";
import { AccessibilityPane } from "./panes/AccessibilityPane";
import { AboutPane } from "@/settings/panes/AboutPane";
import { SPRING_CONTENT, SPRING_SNAPPY } from "@/utils/springs";

// --- Sidebar Categories -------------------------------------------------------

type SettingsCategory =
  | "general"
  | "appearance"
  | "wallpaper"
  | "accessibility"
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
  { id: "general", label: "General", icon: settingsSvg, colorClass: "bg-slate-100 text-slate-700 dark:bg-slate-700/10 dark:text-slate-200" },
  { id: "appearance", label: "Appearance", icon: brushSvg, colorClass: "bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300" },
  { id: "wallpaper", label: "Wallpaper", icon: cameraSvg, colorClass: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300" },
  { id: "accessibility", label: "Accessibility", icon: displaySvg, colorClass: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" },
  { id: "privacy", label: "Privacy", icon: shieldSvg, colorClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  { id: "search", label: "Search Engine", icon: searchSvg, colorClass: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" },
  { id: "hotkeys", label: "Shortcuts", icon: keyboardSvg, colorClass: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
  { id: "gestures", label: "Gestures", icon: gestureSvg, colorClass: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300" },
  { id: "about", label: "About", icon: infoSvg, colorClass: "bg-slate-100 text-slate-700 dark:bg-slate-700/10 dark:text-slate-200" },
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
    case "accessibility":
      return <AccessibilityPane />;
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
            className={`relative flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
              ? "text-gray-900 dark:text-white bg-black/[0.08] dark:bg-white/[0.10] shadow-sm"
              : "text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              }`}
          >
            <span className={`w-9 h-9 flex items-center justify-center rounded-xl shrink-0 transition-all duration-150 ${colorClass}`}>
              <SvgIcon svg={icon} size={18} />
            </span>
            <span className="text-left truncate">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// --- Main Panel ---------------------------------------------------------------

function SettingsPanelInner(): React.JSX.Element {
  const closeSettings = useUIStore((s) => s.closeSettings);
  const disableAnimations = useSettingsStore((s) => s.disableAnimations);
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>("general");

  const categoryLabel =
    CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "";

  return (
    <PanelModal
      onClose={closeSettings}
      width="900px"
      height="600px"
      role="dialog"
      aria-label="Settings"
      aria-modal={true}
    >

      <div className="flex h-full overflow-hidden">
        <div className="flex-shrink-0 h-full">
          <div className="w-[240px] h-full bg-white dark:bg-white/5 flex flex-col overflow-hidden" style={{ borderRight: '1px solid var(--border-subtle)' }}>
            <div className="p-1">
            </div>
            <div className="flex-1 px-1.5 pb-4 overflow-y-auto">
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
                initial={disableAnimations ? undefined : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={disableAnimations ? undefined : { opacity: 0, y: -4 }}
                transition={disableAnimations ? { duration: 0 } : SPRING_CONTENT}
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
                initial={disableAnimations ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={disableAnimations ? undefined : { opacity: 0, y: -6 }}
                transition={disableAnimations ? { duration: 0 } : SPRING_CONTENT}
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
