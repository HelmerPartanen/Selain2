// ─── Privacy Settings Pane ───────────────────────────────────────────────────

import { memo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Desc,
  SectionHeader,
  SettingGroup,
  SettingRow,
  Toggle,
} from "@/settings/components/SettingsShared";
import { useSettingsStore } from "@/store/settingsStore";
import { useHistoryStore } from "@/store/historyStore";
import { useDownloadStore } from "@/store/downloadStore";
import { useBookmarkStore } from "@/store/bookmarkStore";
import { showToast } from "@/components/ui/Toast";
import { SPRING_SNAPPY } from "@/utils/springs";

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
    <div className="space-y-7">
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
        <SectionHeader>Browsing Data</SectionHeader>
        <Desc>Permanently delete stored data. This cannot be undone.</Desc>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const isConfirming = confirmAction === action.id;
            return (
              <motion.button
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
                whileTap={{ scale: 0.97 }}
                transition={SPRING_SNAPPY}
                className={`px-4 py-2.5 rounded-full text-[12px] font-medium transition-all duration-200 ${
                  isConfirming
                    ? "bg-red-500 text-white shadow-sm"
                    : action.destructive
                      ? "text-red-500 dark:text-red-400 bg-red-500/[0.06] dark:bg-red-400/[0.08] border border-red-500/20 dark:border-red-400/20 hover:bg-red-500/[0.1] dark:hover:bg-red-400/[0.14]"
                      : "text-gray-600 dark:text-neutral-300 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.07]"
                }`}
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
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const PrivacyPane = memo(PrivacyPaneInner);
