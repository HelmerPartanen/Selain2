import { memo } from "react";
import { Toggle, SettingGroup, SettingRow } from "@/settings/components/SettingsShared";
import { useSettingsStore } from "@/store/settingsStore";
import { GroupBox } from "@/components/ui/GroupBox";

function AccessibilityPaneInner(): React.JSX.Element {
  const disableAnimations = useSettingsStore((s) => s.disableAnimations);
  const setDisableAnimations = useSettingsStore((s) => s.setDisableAnimations);

  return (
    <div className="space-y-7">
      <GroupBox title="Visibility">
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
      </GroupBox>
    </div>
  );
}

export const AccessibilityPane = memo(AccessibilityPaneInner);
