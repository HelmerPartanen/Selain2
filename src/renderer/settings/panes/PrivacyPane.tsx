// ─── Privacy Settings Pane ───────────────────────────────────────────────────

import { memo, useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import {
  Desc,
  SectionHeader,
  SettingGroup,
  SettingRow,
  Toggle,
} from "@/settings/components/SettingsShared";
import { useSettingsStore } from "@/store/settingsStore";
import type { PrivacyProfile } from "@/store/settingsStore";
import { useHistoryStore } from "@/store/historyStore";
import { useDownloadStore } from "@/store/downloadStore";
import { useBookmarkStore } from "@/store/bookmarkStore";
import type { BookmarkEntry } from "@/store/bookmarkStore";
import { SITE_PERMISSION_LABELS, useSitePermissionsStore } from "@/store/sitePermissionsStore";
import { showToast } from "@/components/ui/Toast";

interface ProfileBackup {
  version: 1
  bookmarks: BookmarkEntry[]
  settings: {
    restoreTabs: boolean
    newTabMode: string
    homepageUrl: string
    uiZoom: number
    enableAutoHide: boolean
    clearOnExit: boolean
    privacyProfile: string
    autoGroupTabsByDomain: boolean
    showTabCleanupSuggestions: boolean
    smartUrlBarFocus: boolean
    showNewTabContinueSection: boolean
    showNewTabFrequentSection: boolean
    enableAdblocker: boolean
    disableAnimations: boolean
    disableBlurEffects: boolean
    uiLayout?: 'floating' | 'classic'
  }
}

function PrivacyPaneInner(): React.JSX.Element {
  const clearOnExit = useSettingsStore((s) => s.clearOnExit);
  const setClearOnExit = useSettingsStore((s) => s.setClearOnExit);
  const enableAdblocker = useSettingsStore((s) => s.enableAdblocker);
  const setEnableAdblocker = useSettingsStore((s) => s.setEnableAdblocker);
  const privacyProfile = useSettingsStore((s) => s.privacyProfile);
  const setPrivacyProfile = useSettingsStore((s) => s.setPrivacyProfile);
  const entries = useSitePermissionsStore((s) => s.entries);
  const permissionEntries = useMemo(() => {
    return Object.values(entries).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [entries]);
  const resetOrigin = useSitePermissionsStore((s) => s.resetOrigin);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const handleExportProfile = useCallback(async () => {
    const s = useSettingsStore.getState()
    const backup: ProfileBackup = {
      version: 1,
      bookmarks: useBookmarkStore.getState().bookmarks,
      settings: {
        restoreTabs: s.restoreTabs,
        newTabMode: s.newTabMode,
        homepageUrl: s.homepageUrl,
        uiZoom: s.uiZoom,
        enableAutoHide: s.enableAutoHide,
        clearOnExit: s.clearOnExit,
        privacyProfile: s.privacyProfile,
        autoGroupTabsByDomain: s.autoGroupTabsByDomain,
        showTabCleanupSuggestions: s.showTabCleanupSuggestions,
        smartUrlBarFocus: s.smartUrlBarFocus,
        showNewTabContinueSection: s.showNewTabContinueSection,
        showNewTabFrequentSection: s.showNewTabFrequentSection,
        enableAdblocker: s.enableAdblocker,
        disableAnimations: s.disableAnimations,
        disableBlurEffects: s.disableBlurEffects,
        uiLayout: s.uiLayout,
      },
    }
    const success = await window.electronAPI.exportProfileBackup(JSON.stringify(backup, null, 2))
    if (success) {
      showToast({ message: 'Profile exported successfully', type: 'success' })
    }
  }, [])

  const handleImportProfile = useCallback(async () => {
    const json = await window.electronAPI.importProfileBackup()
    if (!json) return
    try {
      const data = JSON.parse(json) as ProfileBackup
      if (data.version !== 1) throw new Error('Unsupported version')

      if (Array.isArray(data.bookmarks)) {
        const bkStore = useBookmarkStore.getState()
        data.bookmarks.forEach((b) => {
          if (b.url && !bkStore.isBookmarked(b.url)) {
            bkStore.addBookmark(b.url, b.title || b.url, b.favicon)
          }
        })
      }

      if (data.settings) {
        const s = useSettingsStore.getState()
        const st = data.settings
        if (typeof st.restoreTabs === 'boolean') s.setRestoreTabs(st.restoreTabs)
        if (st.newTabMode === 'bookmarks' || st.newTabMode === 'blank') s.setNewTabMode(st.newTabMode)
        if (typeof st.homepageUrl === 'string') s.setHomepageUrl(st.homepageUrl)
        if (typeof st.uiZoom === 'number') s.setUiZoom(st.uiZoom)
        if (typeof st.enableAutoHide === 'boolean') s.setEnableAutoHide(st.enableAutoHide)
        if (typeof st.clearOnExit === 'boolean') s.setClearOnExit(st.clearOnExit)
        if (['standard', 'strict', 'private'].includes(st.privacyProfile)) s.setPrivacyProfile(st.privacyProfile as PrivacyProfile)
        if (typeof st.autoGroupTabsByDomain === 'boolean') s.setAutoGroupTabsByDomain(st.autoGroupTabsByDomain)
        if (typeof st.showTabCleanupSuggestions === 'boolean') s.setShowTabCleanupSuggestions(st.showTabCleanupSuggestions)
        if (typeof st.smartUrlBarFocus === 'boolean') s.setSmartUrlBarFocus(st.smartUrlBarFocus)
        if (typeof st.showNewTabContinueSection === 'boolean') s.setShowNewTabContinueSection(st.showNewTabContinueSection)
        if (typeof st.showNewTabFrequentSection === 'boolean') s.setShowNewTabFrequentSection(st.showNewTabFrequentSection)
        if (typeof st.enableAdblocker === 'boolean') s.setEnableAdblocker(st.enableAdblocker)
        if (typeof st.disableAnimations === 'boolean') s.setDisableAnimations(st.disableAnimations)
        if (typeof st.disableBlurEffects === 'boolean') s.setDisableBlurEffects(st.disableBlurEffects)
        if (st.uiLayout === 'floating' || st.uiLayout === 'classic') s.setUiLayout(st.uiLayout)
      }

      showToast({ message: 'Profile imported successfully', type: 'success' })
    } catch {
      showToast({ message: 'Failed to import: invalid profile file', type: 'error' })
    }
  }, [])

  const clearHistory = useCallback(() => {
    useHistoryStore.getState().clearAll();
    setConfirmAction(null);
    showToast({ message: "History cleared", type: "success" });
  }, []);

  const clearDownloads = useCallback(() => {
    const store = useDownloadStore.getState();
    const ids = Object.keys(store.downloads);
    ids.forEach((id) => store.removeDownload(id));
    setConfirmAction(null);
    showToast({ message: "Downloads cleared", type: "success" });
  }, []);

  const clearBookmarks = useCallback(() => {
    const store = useBookmarkStore.getState();
    const urls = store.bookmarks.map((b) => b.url);
    urls.forEach((url) => store.removeBookmark(url));
    setConfirmAction(null);
    showToast({ message: "Bookmarks cleared", type: "success" });
  }, []);

  const clearAll = useCallback(() => {
    useHistoryStore.getState().clearAll();
    const dlStore = useDownloadStore.getState();
    Object.keys(dlStore.downloads).forEach((id) => dlStore.removeDownload(id));
    const bkStore = useBookmarkStore.getState();
    bkStore.bookmarks
      .map((b) => b.url)
      .forEach((url) => bkStore.removeBookmark(url));
    setConfirmAction(null);
    showToast({ message: "All browsing data cleared", type: "success" });
  }, []);

  type ClearAction = {
    label: string;
    id: string;
    onConfirm: () => void;
    destructive?: boolean;
  };

  const actions: ClearAction[] = [
    { label: "Clear History", id: "history", onConfirm: clearHistory },
    { label: "Clear Downloads", id: "downloads", onConfirm: clearDownloads },
    { label: "Clear Bookmarks", id: "bookmarks", onConfirm: clearBookmarks },
    {
      label: "Clear All Data",
      id: "all",
      onConfirm: clearAll,
      destructive: true,
    },
  ];

  return (
    <div className="space-y-7">
      <div>
        <SectionHeader>Privacy Profile</SectionHeader>
        <Desc>Choose the default privacy posture for browsing.</Desc>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['standard', 'Standard', 'Balanced protection for daily browsing.'],
            ['strict', 'Strict', 'Prefer blocking and asking before access.'],
            ['private', 'Private', 'Minimize retained data where possible.'],
          ] as Array<[PrivacyProfile, string, string]>).map(([id, label, desc]) => (
            <Card
              key={id}
              role="button"
              tabIndex={0}
              onClick={() => setPrivacyProfile(id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setPrivacyProfile(id);
                }
              }}
              className={`cursor-pointer text-left transition-colors ${
                privacyProfile === id
                  ? 'bg-green-500/10 dark:bg-green-400/10 hover:bg-green-500/15 dark:hover:bg-green-400/15 text-green-600 dark:text-green-300'
                  : 'text-gray-700 dark:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
              }`}
            >
              <Text as="div" size="label" className="text-inherit">
                {label}
              </Text>
              <Text as="div" size="caption" className="mt-1 text-inherit opacity-70">
                {desc}
              </Text>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionHeader>Session</SectionHeader>
        <Desc>Control how data is managed between sessions.</Desc>
        <SettingGroup>
          <SettingRow
            label="Clear data on exit"
            desc="Wipe history, downloads, and bookmarks when the browser closes"
          >
            <Toggle
              checked={clearOnExit}
              onChange={setClearOnExit}
              label="Clear data on exit"
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionHeader>Contents</SectionHeader>
        <Desc>Manage web content display and blocking.</Desc>
        <SettingGroup>
          <SettingRow
            label="Enable Adblocker"
            desc="Block ads and trackers with Ghostery (changes apply after restart)"
          >
            <Toggle
              checked={enableAdblocker}
              onChange={setEnableAdblocker}
              label="Enable Adblocker"
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div>
        <SectionHeader>Site Permissions</SectionHeader>
        <Desc>Review decisions remembered for individual sites.</Desc>
        <SettingGroup>
          {permissionEntries.length === 0 ? (
            <div className="px-3.5 py-3 text-[12px] text-gray-400 dark:text-neutral-500">
              No saved site permission decisions yet.
            </div>
          ) : (
            <>
              {permissionEntries.slice(0, 12).map((entry) => (
                <SettingRow
                  key={`${entry.origin}-${entry.permission}`}
                  label={entry.origin}
                  desc={`${SITE_PERMISSION_LABELS[entry.permission] ?? entry.permission}: ${entry.decision}`}
                >
                  <Button
                    variant="danger"
                    size="xs"
                    rounded="rounded-full"
                    onClick={() => {
                      resetOrigin(entry.origin)
                      showToast({ message: 'Site permissions reset', type: 'success' })
                    }}
                  >
                    Reset
                  </Button>
                </SettingRow>
              ))}
              {permissionEntries.length > 12 && (
                <p className="text-xs text-gray-400 dark:text-neutral-500 text-center py-2">
                  {permissionEntries.length - 12} more sites — clear all to reset
                </p>
              )}
            </>
          )}
        </SettingGroup>
      </div>

      <div>
        <SectionHeader>Profile Backup</SectionHeader>
        <Desc>Export your bookmarks and settings to a file, or restore them from a previous backup.</Desc>
        <div className="flex gap-2">
          <Button
            variant="solid"
            size="md"
            onClick={handleExportProfile}
            className="flex-1"
          >
            Export Profile
          </Button>
          <Button
            variant="solid"
            size="md"
            onClick={handleImportProfile}
            className="flex-1"
          >
            Import Profile
          </Button>
        </div>
      </div>

      <div>
        <SectionHeader>Browsing Data</SectionHeader>
        <Desc>Permanently delete stored data. This cannot be undone.</Desc>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const isConfirming = confirmAction === action.id;
            return (
              <Button
                key={action.id}
                variant={
                  isConfirming
                    ? "primary"
                    : action.destructive
                      ? "danger"
                      : "solid"
                }
                size="md"
                aria-label={
                  isConfirming
                    ? `Confirm ${action.label.toLowerCase()}`
                    : action.label
                }
                onClick={() => {
                  if (isConfirming) {
                    action.onConfirm();
                  } else {
                    setConfirmAction(action.id);
                    setTimeout(
                      () =>
                        setConfirmAction((c) => (c === action.id ? null : c)),
                      3000,
                    );
                  }
                }}
                className={isConfirming ? "bg-red-500 hover:bg-red-600" : ""}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={isConfirming ? "confirm" : "label"}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.12 }}
                  >
                    {isConfirming ? "Confirm?" : action.label}
                  </motion.span>
                </AnimatePresence>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const PrivacyPane = memo(PrivacyPaneInner);
