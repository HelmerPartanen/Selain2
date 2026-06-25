// ─── Appearance Settings Pane ────────────────────────────────────────────────

import { memo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { RangeInput } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Text";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { Desc, SectionHeader, Toggle, SettingRow, SettingGroup } from "@/settings/components/SettingsShared";
import { useThemeStore, type ThemeMode } from "@/store/themeStore";
import { useSettingsStore, UI_ZOOM_OPTIONS, type UiLayout } from "@/store/settingsStore";
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
  const enableAutoHide = useSettingsStore((s) => s.enableAutoHide);
  const setEnableAutoHide = useSettingsStore((s) => s.setEnableAutoHide);

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
              <Button
                key={mode}
                variant="subtle"
                size="lg"
                role="radio"
                aria-checked={isActive}
                aria-label={`${label} theme`}
                onClick={() => setThemeMode(mode)}
                active={isActive}
                className={`relative h-auto flex-1 flex-col gap-2 p-4 ${isActive ? "bg-black/[0.08] dark:bg-white/[0.10]" : "bg-transparent"}`}
              >
                <span className="relative"><SvgIcon svg={icon} size={22} /></span>
                <span className="relative text-[12px] font-medium">{label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader>Interface Scale</SectionHeader>
        <Desc>Scale the browser UI. Does not affect web page content.</Desc>
        <SegmentedControl<number>
          value={selectedUiZoom}
          onChange={handleUiZoomSelect}
          aria-label="Interface scale"
          options={UI_ZOOM_OPTIONS.map((z) => ({
            value: z,
            label: `${z}%`,
            ariaLabel: `${z}% zoom`,
          }))}
        />
      </div>

      <div>
        <SectionHeader>Browser Layout</SectionHeader>
        <Desc>
          Choose between the floating toolbar or a classic browser layout with a tab strip and address bar.
        </Desc>
        <SegmentedControl<UiLayout>
          value={uiLayout}
          onChange={setUiLayout}
          aria-label="Browser layout"
          options={[
            { value: "floating", label: "Floating" },
            { value: "classic", label: "Classic" },
          ]}
        />
        <SettingGroup className="mt-4">
          <SettingRow
            label="Hide UI automatically"
            desc="The floating control bar will hide when inactive and reappear on hover or keyboard activity."
          >
            <Toggle
              checked={enableAutoHide}
              onChange={setEnableAutoHide}
              label="Auto-hide UI"
            />
          </SettingRow>
        </SettingGroup>
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
          <RangeInput
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
          />
          <span
            className="text-[12px] font-normal text-gray-400 dark:text-neutral-500 w-10 text-right tabular-nums"
            aria-hidden="true"
          >
            {(autoHideDelay / 1000).toFixed(1)}s
          </span>
        </div>
        ) : (
          <Text size="caption" tone="muted">
            Switch to the floating layout to configure auto-hide.
          </Text>
        )}
      </div>
    </div>
  );
}

export const AppearancePane = memo(AppearancePaneInner);
