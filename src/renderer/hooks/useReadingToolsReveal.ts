// ─── Reading Tools Reveal ──────────────────────────────────────────────────────
// Reveals the floating "AI Summary" button a couple of seconds after startup
// so it doesn't compete with the first paint for layout work.

import { useEffect, useState } from "react";

type RicWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

export function useReadingToolsReveal(): boolean {
  const [showReadingTools, setShowReadingTools] = useState(false);

  useEffect(() => {
    const reveal = (): void => setShowReadingTools(true);
    const ric = window as RicWindow;

    if (ric.requestIdleCallback) {
      let idleId: number | undefined;
      const timer = window.setTimeout(() => {
        idleId = ric.requestIdleCallback?.(reveal, { timeout: 1500 });
      }, 2500);
      return () => {
        window.clearTimeout(timer);
        if (ric.cancelIdleCallback && idleId !== undefined) {
          ric.cancelIdleCallback(idleId);
        }
      };
    }

    const timer = window.setTimeout(reveal, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  return showReadingTools;
}
