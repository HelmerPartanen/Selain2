import { memo, useState } from "react";

import { AnimatePresence, m } from "motion/react";

import { Button } from "@/components/ui/Button";

import { SvgIcon } from "@/components/ui/SvgIcon";

import chevronLeftSvg from "@/assets/icons/Arrows/Chevron_Left.svg?raw";

import chevronRightSvg from "@/assets/icons/Arrows/Chevron_Right.svg?raw";

import unsplitSvg from "@/assets/icons/Arrows/Triangle_Merge.svg?raw";

import {
  useFocusedTabCanNavigate,
  useIsSplitView,
} from "@/hooks/useTabSelector";

import { useBrowserNavigation } from "@/hooks/useBrowserNavigation";

import { useTabStore } from "@/store/tabStore";

import { useSettingsStore } from "@/store/settingsStore";

import { URLBar } from "@/components/browser/URLBar";

import { AppMenu } from "@/components/layout/AppMenu";

import { SpaceSwitcher } from "@/components/layout/SpaceSwitcher";

import { TabStrip } from "@/components/browser/TabStrip";

import { DownloadPill } from "@/components/browser/DownloadPill";

import { WindowControls } from "@/components/layout/WindowControls";

import { CLASSIC_CHROME_HEIGHT } from "@/components/layout/layoutConstants";

import { SPRING_EXPAND } from "@/utils/springs";

function ClassicBrowserChromeInner(): React.JSX.Element {
  const { handleGoBack, handleGoForward, handleUnsplit } =
    useBrowserNavigation();

  const { canGoBack, canGoForward } = useFocusedTabCanNavigate();

  const isSplit = useIsSplitView();

  const focusedPanel = useTabStore((s) => s.focusedPanel);

  const disableAnimations = useSettingsStore((s) => s.disableAnimations);

  const [isUrlBarFocused, setIsUrlBarFocused] = useState(false);

  const chromeSurface = "bg-[var(--app-bg-secondary)] border-[var(--app-separator)]";

  const toolbarSurface = "bg-[var(--app-bg-tertiary)] border-[var(--app-separator)]";

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[85] flex flex-col [app-region:no-drag]"
      style={{ height: CLASSIC_CHROME_HEIGHT }}
    >
      {/* Tab strip row */}

      <div className={`flex items-center h-11 px-1 border-b ${chromeSurface} [app-region:drag]`}>
        <div className="flex-1 min-w-0 flex items-center pr-1">
          <TabStrip />
        </div>

        <div className="flex-shrink-0 [app-region:no-drag]">
          <WindowControls embedded />
        </div>
      </div>

      {/* Toolbar row */}

      <div
        className={`flex items-center gap-1 h-11 px-1 border-b ${chromeSurface}`}
      >
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <AppMenu />

          <SpaceSwitcher />
        </div>

        <div className="flex items-center flex-shrink-0">
          <Button
            variant="icon"
            size="icon-md"
            onClick={handleGoBack}
            disabled={!canGoBack}
            aria-label="Go back"
          >
            <SvgIcon svg={chevronLeftSvg} size={16} />
          </Button>

          <Button
            variant="icon"
            size="icon-md"
            onClick={handleGoForward}
            disabled={!canGoForward}
            aria-label="Go forward"
          >
            <SvgIcon svg={chevronRightSvg} size={16} />
          </Button>
        </div>

        <div className="flex-1 min-w-0 flex items-center">
          <div
            className={`w-full min-w-0 rounded-lg bg-[var(--app-bg-tertiary)] ${
              isUrlBarFocused
                ? ""
                : ""
            }`}
          >
            <URLBar
              layout="classic"
              popoverDirection="down"
              onFocusChange={setIsUrlBarFocused}
            />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isSplit && (
            <Button
              variant="icon"
              size="icon-md"
              key="unsplit"
              onClick={handleUnsplit}
              aria-label="Exit split view"
              initial={disableAnimations ? undefined : { width: 0, opacity: 0 }}
              animate={{ width: 36, opacity: 1 }}
              exit={disableAnimations ? undefined : { width: 0, opacity: 0 }}
              transition={disableAnimations ? { duration: 0 } : SPRING_EXPAND}
              className="flex-shrink-0 overflow-hidden text-blue-500"
            >
              <SvgIcon svg={unsplitSvg} size={15} />
            </Button>
          )}
        </AnimatePresence>

        <DownloadPill />

        {/* Split panel indicator dots */}

        <AnimatePresence initial={false}>
          {isSplit && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-1.5 px-1 flex-shrink-0"
            >
              <div
    className={`w-1.5 h-1.5 rounded-full transition-colors ${focusedPanel === "primary" ? "bg-[var(--app-accent)]" : "bg-[var(--app-text-tertiary)]"}`}
              />

              <div
    className={`w-1.5 h-1.5 rounded-full transition-colors ${focusedPanel === "split" ? "bg-[var(--app-accent)]" : "bg-[var(--app-text-tertiary)]"}`}
              />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export const ClassicBrowserChrome = memo(ClassicBrowserChromeInner);
