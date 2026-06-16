import { memo } from "react";
import { Desc, SectionHeader, Toggle, SettingRow, SettingGroup } from "@/settings/components/SettingsShared";
import { useSettingsStore } from "@/store/settingsStore";

function GraphicsPaneInner(): React.JSX.Element {
  const disableAnimations = useSettingsStore((s) => s.disableAnimations);
  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects);
  const setDisableAnimations = useSettingsStore((s) => s.setDisableAnimations);
  const setDisableBlurEffects = useSettingsStore((s) => s.setDisableBlurEffects);

  return (
    <div className="space-y-7">
      <div>
        <SectionHeader>Graphics Performance</SectionHeader>
        <Desc>Reduce visual effects to improve responsiveness on low-end hardware.</Desc>
        <SettingGroup className="bg-white dark:bg-white/8">
          <SettingRow
            label="Reduce motion"
            desc="Disable non-essential UI transitions and animated menus."
          >
            <Toggle
              checked={disableAnimations}
              onChange={setDisableAnimations}
              label="Reduce motion"
            />
          </SettingRow>
          <SettingRow
            label="Disable blur and translucency"
            desc="Turn off backdrop blur and glassy transparency for faster rendering."
          >
            <Toggle
              checked={disableBlurEffects}
              onChange={setDisableBlurEffects}
              label="Disable blur effects"
            />
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  );
}

export const GraphicsPane = memo(GraphicsPaneInner);
