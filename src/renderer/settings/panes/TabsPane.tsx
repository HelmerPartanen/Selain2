import { memo } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toggle, SettingGroup, SettingRow } from "@/settings/components/SettingsShared";
import { GroupBox } from "@/components/ui/GroupBox";
import { useSettingsStore, type NewTabMode, type TabsButtonAction } from "@/store/settingsStore";

function TabsPaneInner(): React.JSX.Element {
  const newTabMode = useSettingsStore((s) => s.newTabMode);
  const setNewTabMode = useSettingsStore((s) => s.setNewTabMode);
  const tabsButtonAction = useSettingsStore((s) => s.tabsButtonAction);
  const setTabsButtonAction = useSettingsStore((s) => s.setTabsButtonAction);
  const autoGroupTabsByDomain = useSettingsStore((s) => s.autoGroupTabsByDomain);
  const setAutoGroupTabsByDomain = useSettingsStore((s) => s.setAutoGroupTabsByDomain);
  const showTabCleanupSuggestions = useSettingsStore((s) => s.showTabCleanupSuggestions);
  const setShowTabCleanupSuggestions = useSettingsStore((s) => s.setShowTabCleanupSuggestions);
  const showNewTabContinueSection = useSettingsStore((s) => s.showNewTabContinueSection);
  const setShowNewTabContinueSection = useSettingsStore((s) => s.setShowNewTabContinueSection);
  const showNewTabFrequentSection = useSettingsStore((s) => s.showNewTabFrequentSection);
  const setShowNewTabFrequentSection = useSettingsStore((s) => s.setShowNewTabFrequentSection);

  return (
    <div className="space-y-7">
      <GroupBox
        title="New tab page"
        desc="Choose what appears when you open a new tab."
        contentClassName="space-y-4"
      >
        <SegmentedControl<NewTabMode>
          value={newTabMode}
          onChange={setNewTabMode}
          aria-label="New tab page mode"
          options={[
            { value: "bookmarks", label: "Bookmarks" },
            { value: "blank", label: "Blank page" },
          ]}
        />
        <SettingGroup>
          <SettingRow
            label="Recent pages"
            desc="Show recent pages at the bottom of the new tab page."
          >
            <Toggle
              checked={showNewTabContinueSection}
              onChange={setShowNewTabContinueSection}
              label="Show recent pages"
            />
          </SettingRow>
          <SettingRow
            label="Frequent sites"
            desc="Show shortcuts for the sites you visit most often."
          >
            <Toggle
              checked={showNewTabFrequentSection}
              onChange={setShowNewTabFrequentSection}
              label="Show frequent sites"
            />
          </SettingRow>
        </SettingGroup>
      </GroupBox>

      <GroupBox title="Tab controls" desc="Choose how tab tools behave.">
        <SettingGroup>
          <SettingRow
            label="Tabs button"
            desc="Choose what the tab count button opens."
          >
            <SegmentedControl<TabsButtonAction>
              value={tabsButtonAction}
              onChange={setTabsButtonAction}
              aria-label="Tabs button action"
              options={[
                { value: "overview", label: "Overview" },
                { value: "menu", label: "List" },
              ]}
            />
          </SettingRow>
          <SettingRow
            label="Group similar sites"
            desc="Keep tabs from the same site together automatically."
          >
            <Toggle
              checked={autoGroupTabsByDomain}
              onChange={setAutoGroupTabsByDomain}
              label="Group similar sites"
            />
          </SettingRow>
          <SettingRow
            label="Cleanup suggestions"
            desc="Suggest reviewing old background tabs when many are open."
          >
            <Toggle
              checked={showTabCleanupSuggestions}
              onChange={setShowTabCleanupSuggestions}
              label="Show tab cleanup suggestions"
            />
          </SettingRow>
        </SettingGroup>
      </GroupBox>
    </div>
  );
}

export const TabsPane = memo(TabsPaneInner);
