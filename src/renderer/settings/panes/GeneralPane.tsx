// ─── General Settings Pane ───────────────────────────────────────────────────

import { memo, useCallback, useEffect, useState } from "react";
import {
  GroupBox,
  SettingGroup,
  SettingRow,
  Toggle,
} from "@/settings/components/SettingsShared";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { TextInput } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useSettingsStore, type NewTabMode, type TabsButtonAction } from "@/store/settingsStore";
import { useTabStore } from "@/store/tabStore";
import {
  isValidHomepageUrl,
  normalizeHomepageUrl,
} from "@/utils/urlUtils";

function GeneralPaneInner(): React.JSX.Element {
  const restoreTabs = useSettingsStore((s) => s.restoreTabs);
  const setRestoreTabs = useSettingsStore((s) => s.setRestoreTabs);
  const newTabMode = useSettingsStore((s) => s.newTabMode);
  const setNewTabMode = useSettingsStore((s) => s.setNewTabMode);
  const homepageUrl = useSettingsStore((s) => s.homepageUrl);
  const setHomepageUrl = useSettingsStore((s) => s.setHomepageUrl);
  const autoGroupTabsByDomain = useSettingsStore((s) => s.autoGroupTabsByDomain);
  const setAutoGroupTabsByDomain = useSettingsStore((s) => s.setAutoGroupTabsByDomain);
  const showTabCleanupSuggestions = useSettingsStore((s) => s.showTabCleanupSuggestions);
  const setShowTabCleanupSuggestions = useSettingsStore((s) => s.setShowTabCleanupSuggestions);
  const tabsButtonAction = useSettingsStore((s) => s.tabsButtonAction);
  const setTabsButtonAction = useSettingsStore((s) => s.setTabsButtonAction);
  const smartUrlBarFocus = useSettingsStore((s) => s.smartUrlBarFocus);
  const setSmartUrlBarFocus = useSettingsStore((s) => s.setSmartUrlBarFocus);
  const showNewTabContinueSection = useSettingsStore((s) => s.showNewTabContinueSection);
  const setShowNewTabContinueSection = useSettingsStore((s) => s.setShowNewTabContinueSection);
  const showNewTabFrequentSection = useSettingsStore((s) => s.showNewTabFrequentSection);
  const setShowNewTabFrequentSection = useSettingsStore((s) => s.setShowNewTabFrequentSection);
  const [urlDraft, setUrlDraft] = useState(homepageUrl);
  const [homepageError, setHomepageError] = useState<string | null>(null);

  // Sync draft when store value changes (e.g. "Use current page" or external update)
  useEffect(() => {
    setUrlDraft(homepageUrl);
    setHomepageError(null);
  }, [homepageUrl]);

  const handleUrlBlur = useCallback(() => {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      setHomepageUrl("");
      setHomepageError(null);
      return;
    }
    if (!isValidHomepageUrl(trimmed)) {
      setHomepageError("Enter a valid URL (e.g. https://example.com)");
      return;
    }
    const normalized = normalizeHomepageUrl(trimmed);
    setHomepageUrl(normalized);
    setUrlDraft(normalized);
    setHomepageError(null);
  }, [urlDraft, setHomepageUrl]);

  const handleUrlKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
  }, []);

  const activeTabId = useTabStore((s) => s.activeTabId);
  const tabs = useTabStore((s) => s.tabs);
  const currentTabUrl =
    activeTabId && tabs[activeTabId]
      ? tabs[activeTabId].url
      : "";
  const canUseCurrentPage =
    currentTabUrl &&
    !currentTabUrl.startsWith("browser://") &&
    currentTabUrl !== "about:blank" &&
    isValidHomepageUrl(currentTabUrl);

  const handleUseCurrentPage = useCallback(() => {
    if (!canUseCurrentPage) return;
    const normalized = normalizeHomepageUrl(currentTabUrl);
    setHomepageUrl(normalized);
    setUrlDraft(normalized);
    setHomepageError(null);
  }, [canUseCurrentPage, currentTabUrl, setHomepageUrl]);

  return (
    <div className="space-y-7">
      <GroupBox
        title="Startup"
        desc="Control what happens when the browser opens."
      >
        <SettingGroup>
          <SettingRow
            label="Restore previous tabs"
            desc="Reopen tabs from your last session on startup"
          >
            <Toggle
              checked={restoreTabs}
              onChange={setRestoreTabs}
              label="Restore previous tabs"
            />
          </SettingRow>
          <SettingRow
            label="Smart URL focus"
            desc="Automatically focus the address bar on new and blank tabs so you can start typing immediately."
          >
            <Toggle
              checked={smartUrlBarFocus}
              onChange={setSmartUrlBarFocus}
              label="Smart URL focus"
            />
          </SettingRow>
        </SettingGroup>
      </GroupBox>

      <GroupBox
        title="New Tab"
        desc="Choose what appears when you open a new tab."
        contentClassName="space-y-4"
      >
        <SegmentedControl<NewTabMode>
          value={newTabMode}
          onChange={setNewTabMode}
          aria-label="New tab page mode"
          options={[
            { value: "bookmarks", label: "Bookmarks" },
            { value: "blank", label: "Blank Page" },
          ]}
        />
        <SettingGroup>
          <SettingRow
            label="Continue where you left off"
            desc="Show a list of recently visited pages at the bottom of the new tab page."
          >
            <Toggle
              checked={showNewTabContinueSection}
              onChange={setShowNewTabContinueSection}
              label="Show continue section"
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

      <GroupBox
        title="Tab behavior"
        desc="Let the browser help keep your tabs organized, without losing control."
      >
        <SettingGroup>
          <SettingRow
            label="Tabs button action"
            desc="Choose what the tab count button in the toolbar opens."
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
            desc="Keep tabs from the same site clustered together automatically."
          >
            <Toggle
              checked={autoGroupTabsByDomain}
              onChange={setAutoGroupTabsByDomain}
              label="Group by site"
            />
          </SettingRow>
          <SettingRow
            label="Tab cleanup suggestions"
            desc="Gently suggest reviewing long-lived background tabs when many are open."
          >
            <Toggle
              checked={showTabCleanupSuggestions}
              onChange={setShowTabCleanupSuggestions}
              label="Suggest tab cleanup"
            />
          </SettingRow>
        </SettingGroup>
      </GroupBox>

      <GroupBox
        title="Homepage"
        desc="URL to navigate when clicking the home button. Leave empty to disable."
      >
        <div className="space-y-1.5">
          <TextInput
            type="text"
            value={urlDraft}
            onChange={(e) => {
              setUrlDraft(e.target.value);
              if (homepageError) setHomepageError(null);
            }}
            onBlur={handleUrlBlur}
            onKeyDown={handleUrlKey}
            placeholder="https://example.com"
            aria-label="Homepage URL"
            aria-invalid={!!homepageError}
            aria-describedby={homepageError ? "homepage-error" : undefined}
            spellCheck={false}
            invalid={!!homepageError}
          />
          {homepageError && (
            <Text
              as="p"
              id="homepage-error"
              size="caption"
              tone="danger"
              className="px-1"
            >
              {homepageError}
            </Text>
          )}
          {canUseCurrentPage && (
            <Button
              variant="link"
              size="xs"
              onClick={handleUseCurrentPage}
              className="justify-start px-1"
            >
              Use current page
            </Button>
          )}
        </div>
      </GroupBox>

    </div>
  );
}

export const GeneralPane = memo(GeneralPaneInner);
