// ─── Appearance Settings Pane ────────────────────────────────────────────────

import { memo, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { Desc, SectionHeader, Toggle, SettingRow, SettingGroup } from "@/settings/components/SettingsShared";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";
import { useSettingsStore, UI_ZOOM_OPTIONS, type UiLayout } from "@/store/settingsStore";
import { SPRING_SNAPPY } from "@/utils/springs";
import sunSvg from "@/assets/icons/Weather/Sun_1.svg?raw";
import moonSvg from "@/assets/icons/Weather/Moon.svg?raw";
import displaySvg from "@/assets/icons/Devices/Display.svg?raw";

const THEME_MODES: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: "light", label: "Light", icon: sunSvg },
  { mode: "dark", label: "Dark", icon: moonSvg },
  { mode: "system", label: "System", icon: displaySvg },
];

function AppearancePaneInner(): React.JSX.Element {
  const themeMode = useThemeStore((s) => s.themeMode);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const uiZoom = useSettingsStore((s) => s.uiZoom);
  const setUiZoom = useSettingsStore((s) => s.setUiZoom);
  const [selectedUiZoom, setSelectedUiZoom] = useState(uiZoom);
  const zoomCommitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideDelay = useSettingsStore((s) => s.autoHideDelay);
  const setAutoHideDelay = useSettingsStore((s) => s.setAutoHideDelay);
  const uiLayout = useSettingsStore((s) => s.uiLayout);
  const setUiLayout = useSettingsStore((s) => s.setUiLayout);

  const renderLayoutButton = (layout: UiLayout, label: string) => {
    const active = uiLayout === layout;
    return (
      <button
        type="button"
        onClick={() => setUiLayout(layout)}
        className={[
          "relative flex-1 px-3 py-2 rounded-lg text-[13px] font-normal transition-all duration-150",
          active
            ? "text-gray-700 dark:text-white bg-white dark:bg-white/[0.10]"
            : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
        ].join(" ")}
      >
        {label}
      </button>
    );
  };


  useEffect(() => {
    setSelectedUiZoom(uiZoom);
  }, [uiZoom]);

  useEffect(() => {
    return () => {
      if (zoomCommitTimeoutRef.current) clearTimeout(zoomCommitTimeoutRef.current);
    };
  }, []);

  const handleUiZoomSelect = (zoom: number): void => {
    setSelectedUiZoom(zoom);
    if (zoomCommitTimeoutRef.current) clearTimeout(zoomCommitTimeoutRef.current);
    zoomCommitTimeoutRef.current = setTimeout(() => {
      setUiZoom(zoom);
      zoomCommitTimeoutRef.current = null;
    }, 120);
  };

  return (
    <div className="space-y-7">
      <div>
        <SectionHeader>Theme</SectionHeader>
        <Desc>Choose how the browser interface looks.</Desc>
        <div className="flex gap-2.5" role="radiogroup" aria-label="Theme mode">
          {THEME_MODES.map(({ mode, label, icon }) => {
            const isActive = themeMode === mode;
            return (
              <button
                key={mode}
                role="radio"
                aria-checked={isActive}
                aria-label={`${label} theme`}
                onClick={() => setThemeMode(mode)}
                className={`relative flex-1 flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-150 ${isActive
                    ? "text-gray-700 dark:text-white bg-black/[0.08] dark:bg-white/[0.10]"
                    : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
                  }`}
              >
                <span className="relative"><SvgIcon svg={icon} size={22} /></span>
                <span className="relative text-[12px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader>Interface Scale</SectionHeader>
        <Desc>Scale the browser UI. Does not affect web page content.</Desc>
        <div
          className="flex gap-1 p-1 rounded-xl bg-black/[0.08] dark:bg-white/[0.10]"
          role="radiogroup"
          aria-label="Interface scale"
        >
          {UI_ZOOM_OPTIONS.map((z) => {
            const isActive = selectedUiZoom === z;
            return (
              <button
                key={z}
                role="radio"
                aria-checked={isActive}
                aria-label={`${z}% zoom`}
                onClick={() => handleUiZoomSelect(z)}
                className={`relative flex-1 px-3 py-2 rounded-lg text-[13px] font-normal transition-all duration-150 ${isActive
                    ? "text-gray-700 dark:text-white bg-white dark:bg-white/[0.10]"
                    : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
                  }`}
              >
                <span className="relative">{z}%</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader>Browser Layout</SectionHeader>
        <Desc>
          Choose between the floating toolbar or a classic browser layout with a tab strip and address bar.
        </Desc>
        <div className="flex gap-1 p-1 rounded-xl bg-black/[0.08] dark:bg-white/[0.10]">
          {renderLayoutButton("floating", "Floating")}
          {renderLayoutButton("classic", "Classic")}
        </div>
      </div>

      <div>
        <SectionHeader>Toolbar Auto-Hide</SectionHeader>
        <Desc>
          {uiLayout === 'floating'
            ? 'How long the floating toolbar stays visible after inactivity.'
            : 'Auto-hide only applies to the floating layout.'}
        </Desc>
        {uiLayout === 'floating' ? (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1000}
            max={5000}
            step={250}
            value={autoHideDelay}
            onChange={(e) => setAutoHideDelay(parseInt(e.target.value))}
            aria-label="Toolbar auto-hide delay"
            aria-valuemin={1000}
            aria-valuemax={5000}
            aria-valuenow={autoHideDelay}
            aria-valuetext={`${(autoHideDelay / 1000).toFixed(1)} seconds`}
            className="flex-1 h-1 rounded-full appearance-none bg-black/[0.08] dark:bg-white/[0.1] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-black/[0.08] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb:hover]:scale-115 [&::-webkit-slider-thumb:active]:scale-110 dark:[&::-webkit-slider-thumb]:bg-neutral-200 dark:[&::-webkit-slider-thumb]:ring-white/[0.1]"
          />
          <span
            className="text-[12px] font-normal text-gray-400 dark:text-neutral-500 w-10 text-right tabular-nums"
            aria-hidden="true"
          >
            {(autoHideDelay / 1000).toFixed(1)}s
          </span>
        </div>
        ) : (
          <p className="text-[12px] text-gray-400 dark:text-neutral-500">
            Switch to the floating layout to configure auto-hide.
          </p>
        )}
      </div>
    </div>
  );
}

export const AppearancePane = memo(AppearancePaneInner);
