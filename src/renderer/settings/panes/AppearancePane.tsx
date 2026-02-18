// ─── Appearance Settings Pane ────────────────────────────────────────────────

import { memo } from "react";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { Desc, SectionHeader } from "@/settings/components/SettingsShared";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";
import { useSettingsStore, UI_ZOOM_OPTIONS } from "@/store/settingsStore";
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
  const autoHideDelay = useSettingsStore((s) => s.autoHideDelay);
  const setAutoHideDelay = useSettingsStore((s) => s.setAutoHideDelay);

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader>Theme</SectionHeader>
        <Desc>Choose how the browser interface looks.</Desc>
        <div className="flex gap-3" role="radiogroup" aria-label="Theme mode">
          {THEME_MODES.map(({ mode, label, icon }) => {
            const isActive = themeMode === mode;
            return (
              <button
                key={mode}
                role="radio"
                aria-checked={isActive}
                aria-label={`${label} theme`}
                onClick={() => setThemeMode(mode)}
                className={`flex-1 flex flex-col items-center gap-2.5 p-4 border rounded-2xl transition-all duration-150 ${
                  isActive
                    ? "bg-neutral-100 dark:bg-neutral-800 border-transparent text-indigo-500 dark:text-indigo-400 shadow-lg outline outline-2 outline-indigo-500 dark:outline-indigo-400"
                    : "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                }`}
              >
                <SvgIcon svg={icon} size={22} />
                <span className="text-[12px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader>Interface Scale</SectionHeader>
        <Desc>Scale the browser UI. Does not affect web page content.</Desc>
        <div
          className="flex gap-1.5"
          role="radiogroup"
          aria-label="Interface scale"
        >
          {UI_ZOOM_OPTIONS.map((z) => {
            const isActive = uiZoom === z;
            return (
              <button
                key={z}
                role="radio"
                aria-checked={isActive}
                aria-label={`${z}% zoom`}
                onClick={() => setUiZoom(z)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-500 dark:bg-indigo-400 text-white dark:text-black shadow-sm"
                    : "bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700"
                }`}
              >
                {z}%
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
            className="flex-1 h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-neutral-700 accent-indigo-500 dark:accent-indigo-400 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 dark:[&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:shadow-sm"
          />
          <span
            className="text-[12px] font-mono font-normal text-gray-500 dark:text-neutral-400 w-10 text-right tabular-nums"
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
