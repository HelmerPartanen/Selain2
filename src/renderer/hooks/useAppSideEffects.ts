// ─── App Side Effects ──────────────────────────────────────────────────────────
// A bundle of one-shot subscriptions and lifecycle effects that
// `BrowserLayout` used to host inline. Splitting them out keeps the layout
// component focused on rendering while preserving the original wiring exactly.

import { useEffect } from "react";
import { useDownloadStore } from "@/store/downloadStore";
import { useHistoryStore } from "@/store/historyStore";
import { useBookmarkStore } from "@/store/bookmarkStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useTabStore, onSessionRestoreFailed } from "@/store/tabStore";
import { showToast } from "@/components/ui/Toast";

const CLEAR_ON_EXIT_STORES = [
  "browser-history",
  "download-history",
  "bookmark-store",
] as const;

/** Wire `beforeunload` to wipe browsing data when the user opted in. */
function useClearOnExit(): void {
  const clearOnExit = useSettingsStore((s) => s.clearOnExit);

  useEffect(() => {
    if (!clearOnExit) return;
    const handleBeforeUnload = (): void => {
      useHistoryStore.getState().clearAll();
      const dlStore = useDownloadStore.getState();
      Object.keys(dlStore.downloads).forEach((id) => dlStore.removeDownload(id));
      const bmStore = useBookmarkStore.getState();
      bmStore.bookmarks.forEach((b) => bmStore.removeBookmark(b.url));

      // Ensure persisted data is cleared immediately instead of waiting for
      // debounced async store writes that may not finish during shutdown.
      window.electronAPI.clearStoresSync([...CLEAR_ON_EXIT_STORES]);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [clearOnExit]);
}

/** Gate initial tab creation on tabStore hydration. */
function useTabHydrationGate(): void {
  useEffect(() => {
    function ensureTab(): void {
      if (useTabStore.getState().tabOrder.length === 0) {
        useTabStore.getState().addTab();
      }
    }

    if (useTabStore.persist.hasHydrated()) {
      ensureTab();
    } else {
      const unsub = useTabStore.persist.onFinishHydration(() => {
        ensureTab();
        unsub();
      });
    }
  }, []);
}

/** Open target=_blank links from webviews in a new tab. */
function useOpenUrlInterceptor(): void {
  useEffect(() => {
    return window.electronAPI.onOpenUrlInNewTab((payload) => {
      const url = typeof payload === "string" ? payload : payload.url;
      const isPrivate = typeof payload === "string" ? false : !!payload.isPrivate;
      if (isPrivate) {
        useTabStore.getState().addPrivateTab(url);
      } else {
        useTabStore.getState().addTab(url);
      }
    });
  }, []);
}

/** Toast when the persisted tab session could not be restored. */
function useSessionRestoreNotice(): void {
  useEffect(() => {
    return onSessionRestoreFailed(() => {
      showToast({
        message: "Session could not be restored; starting fresh.",
        type: "info",
      });
      useTabStore.getState().addTab();
    });
  }, []);
}

/** Toast when a download finishes progressing. */
function useDownloadCompletionToasts(): void {
  useEffect(() => {
    const prevStates = new Map<string, string>();
    return useDownloadStore.subscribe((state) => {
      for (const [id, dl] of Object.entries(state.downloads)) {
        const prev = prevStates.get(id);
        prevStates.set(id, dl.state);
        if (prev === "progressing" && dl.state === "completed") {
          showToast({ message: `Downloaded: ${dl.filename}`, type: "success" });
        }
      }
      for (const id of prevStates.keys()) {
        if (!state.downloads[id]) prevStates.delete(id);
      }
    });
  }, []);
}

/**
 * Bundle every BrowserLayout side effect so the layout component only needs
 * one call. Each effect is otherwise independent; grouping keeps the
 * subscription set visible in a single place.
 */
export function useAppSideEffects(): void {
  useClearOnExit();
  useTabHydrationGate();
  useOpenUrlInterceptor();
  useSessionRestoreNotice();
  useDownloadCompletionToasts();
}
