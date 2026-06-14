// ─── Appearance Settings Pane ────────────────────────────────────────────────

import { memo, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { Desc, SectionHeader, Toggle, SettingRow, SettingGroup } from "@/settings/components/SettingsShared";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";
import { useSettingsStore, UI_ZOOM_OPTIONS } from "@/store/settingsStore";
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
                className={`relative flex-1 flex flex-col items-center gap-2 p-4 rounded-3xl transition-all duration-150 ${isActive
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="theme-mode"
                    className="absolute inset-0 rounded-3xl glass glass-interactive"
                    transition={SPRING_SNAPPY}
                  />
                )}
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
          className="flex gap-1 p-1 rounded-full bg-white/25 dark:bg-white/8 shadow"
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
                className={`relative flex-1 px-3 py-2 rounded-full text-[13px] font-normal transition-all duration-150 ${isActive
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="ui-zoom"
                    className="absolute inset-0 rounded-full glass-subtle bg-white/25 dark:bg-white/8 shadow ring-1 ring-black/5 dark:ring-white/10"
                    transition={SPRING_SNAPPY}
                  />
                )}
                <span className="relative">{z}%</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader>Toolbar Auto-Hide</SectionHeader>
        <Desc>
          How long the floating toolbar stays visible after inactivity.
        </Desc>
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
            className="flex-1 h-1 rounded-full appearance-none bg-black/[0.08] dark:bg-white/[0.1] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-black/[0.08] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb:hover]:scale-105 [&::-webkit-slider-thumb:active]:scale-110 dark:[&::-webkit-slider-thumb]:bg-neutral-200 dark:[&::-webkit-slider-thumb]:ring-white/[0.1]"
          />
          <span
            className="text-[12px] font-normal text-gray-400 dark:text-neutral-500 w-10 text-right tabular-nums"
            aria-hidden="true"
          >
            {(autoHideDelay / 1000).toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  );
}

export const AppearancePane = memo(AppearancePaneInner);
