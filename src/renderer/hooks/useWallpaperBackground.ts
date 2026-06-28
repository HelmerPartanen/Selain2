// ─── Wallpaper Background ──────────────────────────────────────────────────────
// Resolves the active wallpaper into the URLs the renderer needs:
//   * `wallpaperUrl`  — the URL for non-dynamic wallpapers (bundled/preset/data URL).
//   * `dynamicLayers` — pre-blended dynamic wallpaper layers, refreshed every minute.
//   * `isDynamic`     — true if the active wallpaper is `dynamic:*`.
//
// Also handles:
//   * Lazy chunk loading for dynamic/bundled wallpapers (none of these
//     ship in the initial bundle).
//   * Converting data-URL wallpapers to blob URLs so the renderer doesn't have
//     to re-parse the base64 string on every paint.
//   * Idle-preloading the next dynamic variant images so transitions feel smooth.

import { useEffect, useMemo, useRef, useState } from "react";
import { useThemeStore } from "@/store/themeStore";
import { useSettingsStore } from "@/store/settingsStore";
import { dataUrlToBlobUrl } from "@/store/wallpaperDB";
import { logger } from "@/utils/logger";
import { wallpaperValueToSolidColor } from "@/theme/presets";
import type {
  DynamicWallpaperLayer,
  DynamicWallpaperMode,
} from "@/theme/dynamicWallpapers";

const isBundledWallpaperKey = (value: string): boolean =>
  value.startsWith("bundled:");
const isDynamicWallpaperKey = (value: string): boolean =>
  value.startsWith("dynamic:");

export interface WallpaperBackground {
  /** Final URL to paint as `background-image` for non-dynamic wallpapers. */
  wallpaperUrl: string | null;
  /** Stacked opacity layers for dynamic wallpapers. */
  dynamicLayers: DynamicWallpaperLayer[];
  /** Whether the active wallpaper is a `dynamic:*` entry. */
  isDynamic: boolean;
  /** Current dynamic-wallpaper blend mode (dynamic/light/dark). */
  dynamicMode: DynamicWallpaperMode;
  /** Explicit solid color selected in the wallpaper pane. */
  solidColor: string | null;
}

export function useWallpaperBackground(): WallpaperBackground {
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const isDynamicWallpaper = !!wallpaper && isDynamicWallpaperKey(wallpaper);
  const solidColor = wallpaperValueToSolidColor(wallpaper);

  // ── Dynamic wallpaper: refresh `now` every minute so the blend changes ──
  const [dynamicWallpaperNow, setDynamicWallpaperNow] = useState(
    () => new Date(),
  );
  useEffect(() => {
    if (!isDynamicWallpaper) return;
    setDynamicWallpaperNow(new Date());
    const id = window.setInterval(() => {
      setDynamicWallpaperNow(new Date());
    }, 60000);
    return () => window.clearInterval(id);
  }, [isDynamicWallpaper]);

  // ── Dynamic wallpaper: subscribe to mode change (dynamic/light/dark) ──
  const [dynamicWallpaperMode, setDynamicWallpaperModeState] =
    useState<DynamicWallpaperMode>("dynamic");
  useEffect(() => {
    if (!isDynamicWallpaper) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    import("@/theme/dynamicWallpapers").then((module) => {
      if (cancelled) return;
      setDynamicWallpaperModeState(module.getDynamicWallpaperMode());
      unsubscribe = module.subscribeDynamicWallpaperMode(() => {
        setDynamicWallpaperModeState(module.getDynamicWallpaperMode());
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isDynamicWallpaper]);

  // ── Dynamic wallpaper: compute layered URLs from current time ──
  const [dynamicWallpaperLayers, setDynamicWallpaperLayers] = useState<
    DynamicWallpaperLayer[]
  >([]);
  useEffect(() => {
    if (!isDynamicWallpaper) {
      setDynamicWallpaperLayers([]);
      return;
    }

    let cancelled = false;
    import("@/theme/dynamicWallpapers").then(async (module) => {
      const layers = await module.getDynamicWallpaperLayers(
        wallpaper,
        dynamicWallpaperNow,
        dynamicWallpaperMode,
      );
      if (!cancelled) setDynamicWallpaperLayers(layers);
    });

    return () => {
      cancelled = true;
    };
  }, [
    isDynamicWallpaper,
    wallpaper,
    dynamicWallpaperNow,
    dynamicWallpaperMode,
  ]);

  // ── Bundled wallpapers: resolve the JPEG URL on demand ──
  const [bundledResolvedUrl, setBundledResolvedUrl] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (!wallpaper || !isBundledWallpaperKey(wallpaper)) {
      setBundledResolvedUrl(null);
      return;
    }
    let cancelled = false;
    import("@/theme/bundledWallpapers").then((module) => {
      module.resolveBundledWallpaperUrl(wallpaper).then(
        (url) => {
          if (!cancelled) setBundledResolvedUrl(url);
        },
        () => {
          if (!cancelled) setBundledResolvedUrl(null);
        },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [wallpaper]);

  // ── Preset wallpapers: gradient SVG keyed by dark/light ──
  // ── Data-URL wallpapers: convert to blob URLs for efficient CSS paint ──
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const wallpaperUrl = useMemo(() => {
    if (!wallpaper || solidColor) return null;
    if (isDynamicWallpaperKey(wallpaper)) return null;
    if (wallpaper.startsWith("preset:")) return null;
    if (isBundledWallpaperKey(wallpaper)) return bundledResolvedUrl;
    const resolved = wallpaper;
    if (resolved.startsWith("data:image/svg+xml")) return resolved;
    if (resolved.startsWith("blob:")) return resolved;

    if (resolved.startsWith("data:")) {
      const blobUrl = dataUrlToBlobUrl(resolved);
      blobUrlsRef.current.add(blobUrl);
      return blobUrl;
    }
    return resolved;
  }, [wallpaper, bundledResolvedUrl, solidColor]);

  // Revoke old blob URLs after new one is rendered, preventing accumulation.
  useEffect(() => {
    const toRevoke: string[] = [];
    const currentUrl = wallpaperUrl;

    for (const url of blobUrlsRef.current) {
      if (url !== currentUrl) toRevoke.push(url);
    }

    for (const url of toRevoke) {
      try {
        URL.revokeObjectURL(url);
        blobUrlsRef.current.delete(url);
      } catch (err) {
        logger.warn("Failed to revoke blob URL:", err);
      }
    }

    return () => {
      for (const url of blobUrlsRef.current) {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          logger.warn("Failed to revoke blob URL on unmount:", err);
        }
      }
      blobUrlsRef.current.clear();
    };
  }, [wallpaperUrl]);

  // ── Dynamic wallpaper: idle-preload variant images for smooth transitions ──
  useEffect(() => {
    if (!isDynamicWallpaper) return;

    const renderedUrls = new Set(
      dynamicWallpaperLayers.map((layer) => layer.url),
    );

    const preload = async (): Promise<void> => {
      const module = await import("@/theme/dynamicWallpapers");
      const urls = await module.getDynamicWallpaperVariantUrls(wallpaper);
      const urlsToPreload = urls.filter((url) => !renderedUrls.has(url));
      if (urlsToPreload.length === 0) return;

      for (const url of urlsToPreload) {
        const img = new Image();
        img.decoding = "async";
        img.src = url;
      }
    };

    const ric = window as unknown as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => number;
    };

    if (ric.requestIdleCallback) {
      let idleId: number | undefined;
      const timer = window.setTimeout(() => {
        idleId = ric.requestIdleCallback?.(() => {
          void preload();
        }, { timeout: 3000 });
      }, 5000);
      return () => {
        window.clearTimeout(timer);
        if (ric.cancelIdleCallback && idleId !== undefined) {
          ric.cancelIdleCallback(idleId);
        }
      };
    }

    const timer = window.setTimeout(() => {
      void preload();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [dynamicWallpaperLayers, isDynamicWallpaper, wallpaper]);

  return {
    wallpaperUrl,
    dynamicLayers: dynamicWallpaperLayers,
    isDynamic: isDynamicWallpaper,
    dynamicMode: dynamicWallpaperMode,
    solidColor,
  };
}

/**
 * Apply the UI zoom factor via Electron's webFrame. Owns the cleanup that
 * restores default zoom on unmount.
 */
export function useUIZoom(): void {
  const uiZoom = useSettingsStore((s) => s.uiZoom);

  useEffect(() => {
    window.electronAPI.setZoomFactor(uiZoom / 100);
    return () => {
      window.electronAPI.setZoomFactor(1);
    };
  }, [uiZoom]);
}
