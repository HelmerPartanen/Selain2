// ─── Settings Panel ──────────────────────────────────────────────────────────
// Shell component: sidebar navigation + content router.
// Each pane is lazy-loaded so the first open of Settings only ships the
// default pane (general). Subsequent panes stream in on click or hover.

import { lazy, memo, Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PanelModal } from "@/components/ui/PanelModal";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { Text } from "@/components/ui/Text";
import closeSvg from "@/assets/icons/Interface/Close_Cross.svg?raw";
import settingsSvg from "@/assets/icons/Objects/Settings.svg?raw";
import brushSvg from "@/assets/icons/Weather/Moon_Fill.svg?raw";
import cameraSvg from "@/assets/icons/News/Image_picture.svg?raw";
import shieldSvg from "@/assets/icons/Objects/Shield.svg?raw";
import searchSvg from "@/assets/icons/Objects/Search.svg?raw";
import infoSvg from "@/assets/icons/Interface/Warn_Info.svg?raw";
import keyboardSvg from "@/assets/icons/Keyboard/Keyboard.svg?raw";
import tabsSvg from "@/assets/icons/Interface/Tabs.svg?raw";
import gaugeSvg from "@/assets/icons/Objects/Gauge.svg?raw";
import puzzleSvg from "@/assets/icons/Objects/Pazzle.svg?raw";
import accountSvg from "@/assets/icons/Human/Person_User.svg?raw";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/utils/classNames";

const GeneralPane = lazy(() =>
  import("@/settings/panes/GeneralPane").then((m) => ({ default: m.GeneralPane }))
);
const AppearancePane = lazy(() =>
  import("@/settings/panes/AppearancePane").then((m) => ({ default: m.AppearancePane }))
);
const WallpaperPane = lazy(() =>
  import("@/settings/panes/WallpaperPane").then((m) => ({ default: m.WallpaperPane }))
);
const TabsPane = lazy(() =>
  import("@/settings/panes/TabsPane").then((m) => ({ default: m.TabsPane }))
);
const AccountsPane = lazy(() =>
  import("@/settings/panes/AccountsPane").then((m) => ({ default: m.AccountsPane }))
);
const PerformancePane = lazy(() =>
  import("@/settings/panes/PerformancePane").then((m) => ({ default: m.PerformancePane }))
);
const PrivacyPane = lazy(() =>
  import("@/settings/panes/PrivacyPane").then((m) => ({ default: m.PrivacyPane }))
);
const ExtensionsPane = lazy(() =>
  import("@/settings/panes/ExtensionsPane").then((m) => ({ default: m.ExtensionsPane }))
);
const SearchEnginePane = lazy(() =>
  import("@/settings/panes/SearchEnginePane").then((m) => ({ default: m.SearchEnginePane }))
);
const HotkeysPane = lazy(() =>
  import("@/settings/panes/HotkeysPane").then((m) => ({ default: m.HotkeysPane }))
);
const AboutPane = lazy(() =>
  import("@/settings/panes/AboutPane").then((m) => ({ default: m.AboutPane }))
);

// --- Sidebar Categories -------------------------------------------------------

type SettingsCategory =
  | "general"
  | "appearance"
  | "wallpaper"
  | "accounts"
  | "tabs"
  | "performance"
  | "privacy"
  | "extensions"
  | "search"
  | "hotkeys"
  | "about";

interface CategoryItem {
  id: SettingsCategory;
  label: string;
  icon: string;
  colorClass: string;
}

const CATEGORIES: CategoryItem[] = [
  { id: "general", label: "Startup", icon: settingsSvg, colorClass: "bg-[var(--app-bg-tertiary)] text-[var(--app-text-secondary)]" },
  { id: "appearance", label: "Appearance", icon: brushSvg, colorClass: "bg-[var(--app-bg-tertiary)] text-[var(--app-text-secondary)]" },
  { id: "wallpaper", label: "Background", icon: cameraSvg, colorClass: "bg-[var(--app-bg-tertiary)] text-[var(--app-text-secondary)]" },
  { id: "accounts", label: "Accounts", icon: accountSvg, colorClass: "bg-[var(--app-bg-tertiary)] text-[var(--app-text-secondary)]" },
  { id: "tabs", label: "Tabs", icon: tabsSvg, colorClass: "bg-[var(--app-bg-tertiary)] text-[var(--app-text-secondary)]" },
  { id: "performance", label: "Performance", icon: gaugeSvg, colorClass: "bg-[var(--app-bg-tertiary)] text-[var(--app-text-secondary)]" },
  { id: "search", label: "Search", icon: searchSvg, colorClass: "bg-[var(--app-bg-tertiary)] text-[var(--app-text-secondary)]" },
  { id: "privacy", label: "Privacy", icon: shieldSvg, colorClass: "bg-[var(--app-bg-tertiary)] text-[var(--app-text-secondary)]" },
  { id: "extensions", label: "Extensions", icon: puzzleSvg, colorClass: "bg-[var(--app-bg-tertiary)] text-[var(--app-text-secondary)]" },
  { id: "hotkeys", label: "Shortcuts", icon: keyboardSvg, colorClass: "bg-[var(--app-bg-tertiary)] text-[var(--app-text-secondary)]" },
  { id: "about", label: "About", icon: infoSvg, colorClass: "bg-[var(--app-bg-tertiary)] text-[var(--app-text-secondary)]" },
];

// --- Content Pane Router ------------------------------------------------------

const PANE_LOADERS: Record<SettingsCategory, () => Promise<{ default: React.ComponentType }>> = {
  general: () =>
    import("@/settings/panes/GeneralPane").then((m) => ({ default: m.GeneralPane })),
  appearance: () =>
    import("@/settings/panes/AppearancePane").then((m) => ({ default: m.AppearancePane })),
  wallpaper: () =>
    import("@/settings/panes/WallpaperPane").then((m) => ({ default: m.WallpaperPane })),
  accounts: () =>
    import("@/settings/panes/AccountsPane").then((m) => ({ default: m.AccountsPane })),
  tabs: () =>
    import("@/settings/panes/TabsPane").then((m) => ({ default: m.TabsPane })),
  performance: () =>
    import("@/settings/panes/PerformancePane").then((m) => ({ default: m.PerformancePane })),
  privacy: () =>
    import("@/settings/panes/PrivacyPane").then((m) => ({ default: m.PrivacyPane })),
  extensions: () =>
    import("@/settings/panes/ExtensionsPane").then((m) => ({ default: m.ExtensionsPane })),
  search: () =>
    import("@/settings/panes/SearchEnginePane").then((m) => ({ default: m.SearchEnginePane })),
  hotkeys: () =>
    import("@/settings/panes/HotkeysPane").then((m) => ({ default: m.HotkeysPane })),
  about: () =>
    import("@/settings/panes/AboutPane").then((m) => ({ default: m.AboutPane })),
};

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
    case "accounts":
      return <AccountsPane />;
    case "tabs":
      return <TabsPane />;
    case "performance":
      return <PerformancePane />;
    case "privacy":
      return <PrivacyPane />;
    case "extensions":
      return <ExtensionsPane />;
    case "search":
      return <SearchEnginePane />;
    case "hotkeys":
      return <HotkeysPane />;
    case "about":
      return <AboutPane />;
  }
}

/** Prefetch a settings pane chunk without mounting it. Safe to call repeatedly. */
const prefetchedPanes = new Set<SettingsCategory>();
export function prefetchSettingsPane(category: SettingsCategory): void {
  if (prefetchedPanes.has(category)) return;
  prefetchedPanes.add(category);
  void PANE_LOADERS[category]();
}

function scheduleSettingsPanePrefetch(category: SettingsCategory): () => void {
  if (prefetchedPanes.has(category)) return () => {};

  let cancelled = false;
  let idleId: number | null = null;
  let timeoutId: number | null = null;

  const run = (): void => {
    if (!cancelled) prefetchSettingsPane(category);
  };

  if (typeof window.requestIdleCallback === "function") {
    idleId = window.requestIdleCallback(run, { timeout: 900 });
  } else {
    timeoutId = window.setTimeout(run, 180);
  }

  return () => {
    cancelled = true;
    if (idleId !== null && typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(idleId);
    }
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  };
}

function PaneSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="h-6 w-40 rounded-md bg-[var(--app-control-hover)] animate-pulse" />
      <div className="h-4 w-72 rounded-md bg-[var(--app-control-hover)]/60 animate-pulse" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-20 rounded-lg bg-[var(--app-control-hover)]/40 animate-pulse" />
        <div className="h-20 rounded-lg bg-[var(--app-control-hover)]/40 animate-pulse" />
        <div className="h-20 rounded-lg bg-[var(--app-control-hover)]/40 animate-pulse" />
        <div className="h-20 rounded-lg bg-[var(--app-control-hover)]/40 animate-pulse" />
      </div>
    </div>
  );
}

// --- Sidebar ------------------------------------------------------------------

function Sidebar({
  activeCategory,
  onSelect,
}: {
  activeCategory: SettingsCategory;
  onSelect: (id: SettingsCategory) => void;
}): React.JSX.Element {
  const cancelPrefetchRef = useRef<(() => void) | null>(null);

  const queuePrefetch = (id: SettingsCategory): void => {
    cancelPrefetchRef.current?.();
    cancelPrefetchRef.current = scheduleSettingsPanePrefetch(id);
  };

  useEffect(() => {
    return () => cancelPrefetchRef.current?.();
  }, []);

  return (
    <nav aria-label="Settings categories" className="flex flex-col gap-1">
      {CATEGORIES.map(({ id, label, icon, colorClass }) => {
        const isActive = activeCategory === id
        return (
          <Button
  key={id}
  variant="ghost"
  size="md"
  onClick={() => onSelect(id)}
  onMouseEnter={() => queuePrefetch(id)}
  onFocus={() => queuePrefetch(id)}
  aria-current={isActive ? "page" : undefined}
  active={isActive}
  className={cn(
    "relative h-auto w-full justify-start gap-3 rounded-lg py-2.5",
    isActive &&
      "!bg-[var(--app-control-active)] !text-[var(--app-text-primary)] hover:!bg-[var(--app-control-active)]"
  )}
>
  <span
    className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-colors duration-100 ${isActive ? "bg-[var(--app-accent-bg)] text-[var(--app-accent)]" : colorClass}`}
  >
    <SvgIcon svg={icon} size={18} />
  </span>

  <Text
    as="span"
    size="body"
    tone="primary"
    className="truncate text-left font-medium"
  >
    {label}
  </Text>
</Button>
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

  // Prefetch the default pane + the active one so first paint is instant.
  // The default pane is loaded eagerly by the lazy() call below; this keeps
  // it warm after a category switch.
  useEffect(() => {
    prefetchSettingsPane(activeCategory);
  }, [activeCategory]);

  const categoryLabel =
    CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "";

  return (
    <PanelModal
  onClose={closeSettings}
  width="1100px"
  height="700px"
  motionPreset="flat"
  role="dialog"
  aria-label="Settings"
  aria-modal={true}
  className="will-change-transform"
>
  <div className="flex h-full overflow-hidden">
    <div className="flex-shrink-0 h-full">
      <div className="w-[240px] h-full bg-[var(--app-grouped-bg-secondary)] border-r border-[var(--app-separator)] flex flex-col overflow-hidden">
        <div className="px-4 pb-3 pt-4">
          <Text size="body" tone="primary" className="font-semibold">
            Settings
          </Text>
          <Text size="caption" tone="muted">
            Preferences
          </Text>
        </div>

        <div className="flex-1 px-2 pb-4 overflow-y-auto">
          <Sidebar
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
          />
        </div>
      </div>
    </div>

    <div className="flex-1 flex flex-col min-w-0">
      <div className="relative flex items-center justify-center px-6 pt-3 pb-3">
        <Text as="h3" size="caption" tone="primary" className="font-semibold">
          {categoryLabel}
        </Text>

        <Button
          variant="icon"
          onClick={closeSettings}
          aria-label="Close settings"
          rounded="rounded-lg"
          className="absolute right-2 top-1/2 -translate-y-1/2"
        >
          <SvgIcon svg={closeSvg} size={13} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-4 glass-scroll [contain:layout_paint]">
        <div key={activeCategory}>
          <Suspense fallback={<PaneSkeleton />}>
            <SettingsContent category={activeCategory} />
          </Suspense>
        </div>
      </div>
    </div>
  </div>
</PanelModal>
  );
}

export const SettingsPanel = memo(SettingsPanelInner);
