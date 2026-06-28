// ─── General Settings Pane ───────────────────────────────────────────────────

import { memo, useCallback, useEffect, useState } from "react";
import { SettingGroup, SettingRow, Toggle } from "@/settings/components/SettingsShared";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { TextInput } from "@/components/ui/Input";
import { useSettingsStore } from "@/store/settingsStore";
import { useTabStore } from "@/store/tabStore";
import { GroupBox } from "@/components/ui/GroupBox";
import {
  isValidHomepageUrl,
  normalizeHomepageUrl,
} from "@/utils/urlUtils";

function GeneralPaneInner(): React.JSX.Element {
  const restoreTabs = useSettingsStore((s) => s.restoreTabs);
  const setRestoreTabs = useSettingsStore((s) => s.setRestoreTabs);
  const homepageUrl = useSettingsStore((s) => s.homepageUrl);
  const setHomepageUrl = useSettingsStore((s) => s.setHomepageUrl);
  const smartUrlBarFocus = useSettingsStore((s) => s.smartUrlBarFocus);
  const setSmartUrlBarFocus = useSettingsStore((s) => s.setSmartUrlBarFocus);
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
        desc="Choose what opens with the browser."
      >
        <SettingGroup>
          <SettingRow
            label="Restore previous tabs"
            desc="Reopen tabs from your last session."
          >
            <Toggle
              checked={restoreTabs}
              onChange={setRestoreTabs}
              label="Restore previous tabs"
            />
          </SettingRow>
          <SettingRow
            label="Smart URL focus"
            desc="Focus the address bar on new and blank tabs."
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
        title="Homepage"
        desc="Page to open from the home button. Leave empty to disable it."
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
