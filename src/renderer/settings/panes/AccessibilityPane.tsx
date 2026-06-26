import { memo } from "react";
import { Toggle, SettingGroup, SectionHeader, SettingRow } from "@/settings/components/SettingsShared";
import { useSettingsStore } from "@/store/settingsStore";

function AccessibilityPaneInner(): React.JSX.Element {
  const disableAnimations = useSettingsStore((s) => s.disableAnimations);
  const setDisableAnimations = useSettingsStore((s) => s.setDisableAnimations);

  return (
    <div className="space-y-7">
      <div>
        <SectionHeader className="mb-3">Visibility</SectionHeader> 
        <SettingGroup>
          <SettingRow
            label="Reduce motion"
            desc="Disable UI transitions and animations."
          >
            <Toggle
              checked={disableAnimations}
              onChange={setDisableAnimations}
              label="Reduce motion"
            />
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
  );
}

export const AccessibilityPane = memo(AccessibilityPaneInner);
