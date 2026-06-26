// ─── Modal Preload ─────────────────────────────────────────────────────────────
// Preload heavy modal chunks after startup settles so the first user-initiated
// open feels instant. Skipped if any modal is already open (we'd be racing
// the actual import).

import { useEffect } from "react";
import { useUIStore } from "@/store/uiStore";

type RicWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

export function useModalPreload(): void {
  const isSettingsOpen = useUIStore((s) => s.isSettingsOpen);
  const isBookmarksOpen = useUIStore((s) => s.isBookmarksOpen);
  const isHistoryOpen = useUIStore((s) => s.isHistoryOpen);
  const isDownloadsOpen = useUIStore((s) => s.isDownloadsOpen);
  const isTabOverviewOpen = useUIStore((s) => s.isTabOverviewOpen);
  const isAIFullscreenOpen = useUIStore((s) => s.isAIFullscreenOpen);
  const isReaderModeOpen = useUIStore((s) => s.isReaderModeOpen);

  useEffect(() => {
    if (
      isSettingsOpen ||
      isBookmarksOpen ||
      isHistoryOpen ||
      isDownloadsOpen ||
      isTabOverviewOpen ||
      isAIFullscreenOpen ||
      isReaderModeOpen
    ) {
      return;
    }

    const preload = (): void => {
      void import("@/settings/SettingsPanel");
      void import("@/bookmarks/BookmarksPage");
      void import("@/history/HistoryPage");
      void import("@/downloads/DownloadsPage");
      void import("@/components/browser/TabOverview");
      void import("@/components/ai/AIFullscreenPage");
      void import("@/components/reader/ReaderModePage");
    };

    const ric = window as RicWindow;

    if (ric.requestIdleCallback) {
      let idleId: number | undefined;
      const timer = window.setTimeout(() => {
        idleId = ric.requestIdleCallback?.(preload, { timeout: 2000 });
      }, 10000);
      return () => {
        window.clearTimeout(timer);
        if (ric.cancelIdleCallback && idleId !== undefined) {
          ric.cancelIdleCallback(idleId);
        }
      };
    }

    const timer = window.setTimeout(preload, 10000);
    return () => window.clearTimeout(timer);
  }, [
    isSettingsOpen,
    isBookmarksOpen,
    isHistoryOpen,
    isDownloadsOpen,
    isTabOverviewOpen,
    isAIFullscreenOpen,
    isReaderModeOpen,
  ]);
}
