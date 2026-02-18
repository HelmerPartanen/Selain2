// ─── Privacy Settings Pane ───────────────────────────────────────────────────

import { memo, useCallback, useState } from "react";
import {
  Desc,
  SectionHeader,
  SettingRow,
  Toggle,
} from "@/settings/components/SettingsShared";
import { useSettingsStore } from "@/store/settingsStore";
import { useHistoryStore } from "@/store/historyStore";
import { useDownloadStore } from "@/store/downloadStore";
import { useBookmarkStore } from "@/store/bookmarkStore";
import { showToast } from "@/components/ui/Toast";

function PrivacyPaneInner(): React.JSX.Element {
  const clearOnExit = useSettingsStore((s) => s.clearOnExit);
  const setClearOnExit = useSettingsStore((s) => s.setClearOnExit);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

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
    <div className="space-y-6">
      <div>
        <SectionHeader>Session</SectionHeader>
        <Desc>Control how data is managed between sessions.</Desc>
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
      </div>

      <div>
        <SectionHeader>Browsing Data</SectionHeader>
        <Desc>Permanently delete stored data. This cannot be undone.</Desc>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const isConfirming = confirmAction === action.id;
            return (
              <button
                key={action.id}
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
                className={`px-4 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-150 active:scale-[0.97] ${
                  isConfirming
                    ? "bg-red-500 dark:bg-red-500 text-white border border-red-500"
                    : action.destructive
                      ? "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-900/30"
                      : "text-gray-600 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-700"
                }`}
              >
                {isConfirming ? "Confirm?" : action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const PrivacyPane = memo(PrivacyPaneInner);
