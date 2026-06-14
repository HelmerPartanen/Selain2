// ─── General Settings Pane ───────────────────────────────────────────────────

import { memo, useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Desc,
  SectionHeader,
  SettingGroup,
  SettingRow,
  Toggle,
} from "@/settings/components/SettingsShared";
import { useSettingsStore, type NewTabMode } from "@/store/settingsStore";
import { useTabStore } from "@/store/tabStore";
import { SPRING_SNAPPY } from "@/utils/springs";
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
  const smartUrlBarFocus = useSettingsStore((s) => s.smartUrlBarFocus);
  const setSmartUrlBarFocus = useSettingsStore((s) => s.setSmartUrlBarFocus);
  const showNewTabContinueSection = useSettingsStore((s) => s.showNewTabContinueSection);
  const setShowNewTabContinueSection = useSettingsStore((s) => s.setShowNewTabContinueSection);
  const showNewTabFrequentSection = useSettingsStore((s) => s.showNewTabFrequentSection);
  const setShowNewTabFrequentSection = useSettingsStore((s) => s.setShowNewTabFrequentSection);
  const enableAutoHide = useSettingsStore((s) => s.enableAutoHide);
  const setEnableAutoHide = useSettingsStore((s) => s.setEnableAutoHide);
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
      <div>
        <SectionHeader>Startup</SectionHeader>
        <Desc>Control what happens when the browser opens.</Desc>
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
      </div>

      <div>
        <SectionHeader>New Tab</SectionHeader>
        <Desc>Choose what appears when you open a new tab.</Desc>
        <div
          className="flex gap-1 p-1 rounded-full bg-white/25 dark:bg-white/8 shadow"
          role="radiogroup"
          aria-label="New tab page mode"
        >
          {(["bookmarks", "blank"] as NewTabMode[]).map((mode) => {
            const isActive = newTabMode === mode;
            const label = mode === "bookmarks" ? "Bookmarks" : "Blank Page";
            return (
              <button
                key={mode}
                role="radio"
                aria-checked={isActive}
                onClick={() => setNewTabMode(mode)}
                className={`relative flex-1 px-3 py-2 rounded-full text-[13px] font-normal transition-all duration-150 ${isActive
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="newtab-mode"
                    className="absolute inset-0 rounded-full glass glass-interactive"
                    transition={SPRING_SNAPPY}
                  />
                )}
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>
        <SettingGroup className="mt-4">
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
      </div>

      <div>
        <SectionHeader>Tab behavior</SectionHeader>
        <Desc>Let the browser help keep your tabs organized, without losing control.</Desc>
        <SettingGroup>
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
      </div>

      <div>
        <SectionHeader>User Interface</SectionHeader>
        <Desc>Customize the appearance and behavior of the floating controls.</Desc>
        <SettingGroup>
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
        <SectionHeader>Homepage</SectionHeader>
        <Desc>
          URL to navigate when clicking the home button. Leave empty to disable.
        </Desc>
        <div className="space-y-1.5">
          <input
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
            className={`w-full px-3.5 py-2.5 rounded-full glass bg-white/25 dark:bg-white/8 shadow ring-1 text-[13px] font-normal text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-500 outline-none border transition-all duration-200 ${
              homepageError
                ? "ring-red-500/50 dark:ring-red-400/50 border-red-500/30 dark:border-red-400/30"
                : "ring-black/5 dark:ring-white/10 border-transparent focus:border-blue-500/30 dark:focus:border-blue-400/30 focus-visible:ring-2 focus-visible:ring-blue-400/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            }`}
          />
          {homepageError && (
            <p
              id="homepage-error"
              className="text-[12px] text-red-600 dark:text-red-400 px-1"
            >
              {homepageError}
            </p>
          )}
          {canUseCurrentPage && (
            <button
              type="button"
              onClick={handleUseCurrentPage}
              className="text-[12px] text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded px-1"
            >
              Use current page
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

export const GeneralPane = memo(GeneralPaneInner);
