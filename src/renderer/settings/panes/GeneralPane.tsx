// ─── General Settings Pane ───────────────────────────────────────────────────

import { useCallback, useState } from "react";
import {
  Desc,
  SectionHeader,
  SettingRow,
  Toggle,
} from "@/settings/components/SettingsShared";
import { useSettingsStore, type NewTabMode } from "@/store/settingsStore";

export function GeneralPane(): React.JSX.Element {
  const restoreTabs = useSettingsStore((s) => s.restoreTabs);
  const setRestoreTabs = useSettingsStore((s) => s.setRestoreTabs);
  const newTabMode = useSettingsStore((s) => s.newTabMode);
  const setNewTabMode = useSettingsStore((s) => s.setNewTabMode);
  const homepageUrl = useSettingsStore((s) => s.homepageUrl);
  const setHomepageUrl = useSettingsStore((s) => s.setHomepageUrl);
  const reduceTransparency = useSettingsStore((s) => s.reduceTransparency);
  const setReduceTransparency = useSettingsStore(
    (s) => s.setReduceTransparency,
  );
  const [urlDraft, setUrlDraft] = useState(homepageUrl);

  const handleUrlBlur = useCallback(() => {
    const trimmed = urlDraft.trim();
    setHomepageUrl(trimmed);
  }, [urlDraft, setHomepageUrl]);

  const handleUrlKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader>Startup</SectionHeader>
        <Desc>Control what happens when the browser opens.</Desc>
        <div className="space-y-1">
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
        </div>
      </div>

      <div>
        <SectionHeader>New Tab</SectionHeader>
        <Desc>Choose what appears when you open a new tab.</Desc>
        <div
          className="flex gap-2"
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
                className={`flex-1 px-4 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-500 dark:bg-indigo-400 text-white dark:text-black shadow-sm"
                    : "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 border border-gray-200 dark:border-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-700"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader>Homepage</SectionHeader>
        <Desc>
          URL to navigate when clicking the home button. Leave empty to disable.
        </Desc>
        <input
          type="text"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onBlur={handleUrlBlur}
          onKeyDown={handleUrlKey}
          placeholder="https://example.com"
          aria-label="Homepage URL"
          spellCheck={false}
          className="w-full px-3 py-2 rounded-xl text-[12px] bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-500 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors duration-150"
        />
      </div>

      <div>
        <SectionHeader>Performance</SectionHeader>
        <Desc>
          Options that may improve responsiveness on lower-end hardware.
        </Desc>
        <div className="space-y-1">
          <SettingRow
            label="Reduce transparency"
            desc="Disable backdrop blur and translucent surfaces"
          >
            <Toggle
              checked={reduceTransparency}
              onChange={setReduceTransparency}
              label="Reduce transparency"
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}
