// ─── General Settings Pane ───────────────────────────────────────────────────

import { memo, useCallback, useState } from "react";
import { motion } from "motion/react";
import {
  Desc,
  SectionHeader,
  SettingGroup,
  SettingRow,
  Toggle,
} from "@/settings/components/SettingsShared";
import { useSettingsStore, type NewTabMode } from "@/store/settingsStore";
import { SPRING_SNAPPY } from "@/utils/springs";

function GeneralPaneInner(): React.JSX.Element {
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
        </SettingGroup>
      </div>

      <div>
        <SectionHeader>New Tab</SectionHeader>
        <Desc>Choose what appears when you open a new tab.</Desc>
        <div
          className="flex gap-1.5 p-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]"
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
                className={`relative flex-1 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors duration-150 ${
                  isActive
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="newtab-mode"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-white/[0.1] shadow-sm"
                    transition={SPRING_SNAPPY}
                  />
                )}
                <span className="relative">{label}</span>
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
          className="w-full px-3.5 py-2.5 rounded-xl text-[12px] bg-black/[0.03] dark:bg-white/[0.04] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-500 outline-none border border-transparent focus:border-indigo-500/30 dark:focus:border-indigo-400/30 transition-all duration-200"
        />
      </div>

      <div>
        <SectionHeader>Performance</SectionHeader>
        <Desc>
          Options that may improve responsiveness on lower-end hardware.
        </Desc>
        <SettingGroup>
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
        </SettingGroup>
      </div>
    </div>
  );
}

export const GeneralPane = memo(GeneralPaneInner);
