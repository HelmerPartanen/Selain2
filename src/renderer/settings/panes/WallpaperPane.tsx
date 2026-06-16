// ─── Wallpaper Settings Pane ─────────────────────────────────────────────────

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { SectionHeader } from "@/settings/components/SettingsShared";
import { useThemeStore } from "@/store/themeStore";
import {
  WALLPAPER_PRESETS,
  SOLID_COLOR_PRESETS,
  PRESET_PREFIX,
} from "@/theme/presets";
import {
  BUNDLED_WALLPAPERS,
  generateThumbnail,
  resolveBundledWallpaperUrl,
} from "@/theme/bundledWallpapers";
import { getPresetThumbnailUrl } from "@/theme/presetThumbnails";
import { showToast } from "@/components/ui/Toast";
import { logger } from "@/utils/logger";
import { useIsDark } from "@/hooks/useIsDark";
import uploadSvg from "@/assets/icons/Objects/Tray_Arrow_Up.svg?raw";
import trashSvg from "@/assets/icons/Objects/Trash.svg?raw";

// --- Computed constants -------------------------------------------------------

const solidBaseColors: string[] = SOLID_COLOR_PRESETS.map((c) => c.hex);

function solidToDataUrl(hex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${hex}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const SOLID_DATA_URL_MAP = new Map<string, string>(
  SOLID_COLOR_PRESETS.map((c) => [c.hex, solidToDataUrl(c.hex)]),
);

// Pre-compute the set of active solid data URLs once so the per-render
// `isActive` check is an O(1) Set membership test.
const SOLID_DATA_URLS_SET = new Set(SOLID_DATA_URL_MAP.values());

// Shared button class strings so the className doesn't re-concatenate on
// every render. (Tailwind JIT doesn't need the strings to be literal in
// source — the classes are already used in the file.)
const THUMB_BASE_CLASS =
  "relative flex-shrink-0 w-[180px] aspect-[16/10] rounded-lg overflow-hidden transition-all duration-150";
const THUMB_RING_ACTIVE =
  "ring-2 ring-blue-500/60 dark:ring-blue-400/60 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900";
const THUMB_RING_INACTIVE =
  "ring-1 ring-black/[0.06] dark:ring-white/[0.06] hover:ring-black/[0.12] dark:hover:ring-white/[0.12]";

// --- Lazy Wallpaper Thumbnail ------------------------------------------------
//
// Renders a <button> containing a single <img loading="lazy">. The browser
// handles intersection-based lazy loading natively, which is faster and
// composes better with the GPU than a hand-rolled IntersectionObserver for
// this many small images.

interface LazyThumbProps {
  alt: string;
  /** Pre-resolved source URL (e.g. cached blob: URL or a static data URL). */
  src: string;
  isActive: boolean;
  onSelect: () => void;
  /** Extra class names to merge into the button. */
  className?: string;
}

const LazyThumb = memo(function LazyThumb({
  alt,
  src,
  isActive,
  onSelect,
  className = "",
}: LazyThumbProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={alt}
      aria-pressed={isActive}
      className={`${THUMB_BASE_CLASS} ${className} ${
        isActive ? THUMB_RING_ACTIVE : THUMB_RING_INACTIVE
      }`}
    >
      {src ? (
        <img
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover select-none"
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-800" />
      )}
    </button>
  );
});

/**
 * Bundled-wallpaper thumbnail — resolves the asset URL asynchronously,
 * then funnels it through the shared `generateThumbnail` cache.
 */
const BundledThumb = memo(function BundledThumb({
  storageKey,
  isActive,
  onSelect,
}: {
  storageKey: string;
  isActive: boolean;
  onSelect: (key: string) => void;
}): React.JSX.Element {
  // Synchronous cache hit avoids a paint with no thumb on re-mount.
  const [thumbUrl, setThumbUrl] = useState<string>(() => {
    // The bundled cache is module-level; we don't have a synchronous read,
    // so we return "" and let the effect fill it in. The button's empty
    // branch renders a neutral background during that single frame.
    return "";
  });

  useEffect(() => {
    let cancelled = false;
    resolveBundledWallpaperUrl(storageKey)
      .then((url) => generateThumbnail(url))
      .then((t) => {
        if (!cancelled) setThumbUrl(t);
      })
      .catch((err) => {
        logger.warn("Failed to load bundled thumb:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  return (
    <LazyThumb
      alt={`Select wallpaper ${storageKey.replace("bundled:", "")}`}
      src={thumbUrl}
      isActive={isActive}
      onSelect={() => onSelect(storageKey)}
    />
  );
});

/**
 * Gradient-preset thumbnail. Uses a module-level blob URL cache keyed by
 * (presetId, isDark) so the first render after mount may briefly show the
 * empty-state background, but every subsequent render (including theme
 * toggles) is a synchronous cache hit.
 */
const GradientThumb = memo(function GradientThumb({
  preset,
  isDark,
  isActive,
  onSelect,
}: {
  preset: (typeof WALLPAPER_PRESETS)[number];
  isDark: boolean;
  isActive: boolean;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  // The cache is module-level; this getter is O(1) on hit and starts a
  // background job on miss. We mirror its result into local state so the
  // blob URL gets applied once it's ready, then never changes.
  const initialUrl = getPresetThumbnailUrl(preset, isDark);
  const [thumbUrl, setThumbUrl] = useState<string>(initialUrl);

  useEffect(() => {
    // Re-derive in case isDark changed or the cache warmed asynchronously.
    const url = getPresetThumbnailUrl(preset, isDark);
    if (url && url !== thumbUrl) {
      setThumbUrl(url);
    } else if (!url) {
      // Cache is still warming; poll lightly until the job completes.
      const id = window.setInterval(() => {
        const next = getPresetThumbnailUrl(preset, isDark);
        if (next) {
          setThumbUrl(next);
          window.clearInterval(id);
        }
      }, 60);
      return () => window.clearInterval(id);
    }
    // thumbUrl is intentionally omitted — we only want to re-derive when
    // the cache key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, isDark]);

  return (
    <LazyThumb
      alt={`Select gradient: ${preset.name}`}
      src={thumbUrl}
      isActive={isActive}
      onSelect={() => onSelect(preset.id)}
    />
  );
});

// --- Wallpaper Pane ----------------------------------------------------------

function WallpaperPaneInner(): React.JSX.Element {
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const setWallpaper = useThemeStore((s) => s.setWallpaper);
  const isDark = useIsDark();

  const handleSelectPreset = useCallback(
    (dataUrl: string) => setWallpaper(dataUrl),
    [setWallpaper],
  );

  const handleSelectGradient = useCallback(
    (presetId: string) => setWallpaper(`${PRESET_PREFIX}${presetId}`),
    [setWallpaper],
  );

  const handleSelectSolid = useCallback(
    (hex: string) => {
      const dataUrl = SOLID_DATA_URL_MAP.get(hex);
      if (dataUrl) setWallpaper(dataUrl);
    },
    [setWallpaper],
  );

  const handleCustomImage = useCallback(async () => {
    try {
      const dataUrl = await window.electronAPI.openImageDialog();
      if (dataUrl) {
        setWallpaper(dataUrl);
        showToast({ message: "Wallpaper updated", type: "success" });
      }
    } catch (err) {
      logger.error("Failed to open image dialog:", err)
      showToast({ message: "Failed to set wallpaper", type: "error" });
    }
  }, [setWallpaper]);

  const handleClear = useCallback(() => {
    setWallpaper(null);
    showToast({ message: "Wallpaper removed", type: "info" });
  }, [setWallpaper]);

  // Note: we intentionally do NOT clear the bundled or preset thumbnail
  // caches on unmount. Both caches are tiny (<20 small blob URLs) and
  // surviving across settings open/close means re-opens are instant.

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader className="mb-3">Wallpapers</SectionHeader>
        <div
          className="flex gap-2.5 overflow-x-auto p-1.5 -m-1.5 glass-scroll"
          role="listbox"
          aria-label="Bundled wallpapers"
        >
          {BUNDLED_WALLPAPERS.map((wp) => (
            <BundledThumb
              key={wp.filename}
              storageKey={wp.storageKey}
              isActive={wallpaper === wp.storageKey}
              onSelect={handleSelectPreset}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionHeader className="mb-3">Gradients</SectionHeader>
        <div
          className="flex gap-2.5 overflow-x-auto p-1.5 -m-1.5 glass-scroll"
          role="listbox"
          aria-label="Gradient wallpapers"
        >
          {WALLPAPER_PRESETS.map((preset) => {
            const presetKey = `${PRESET_PREFIX}${preset.id}`;
            return (
              <GradientThumb
                key={preset.id}
                preset={preset}
                isDark={isDark}
                isActive={wallpaper === presetKey}
                onSelect={handleSelectGradient}
              />
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader className="mb-3">Solid Colors</SectionHeader>
        <div
          className="grid grid-cols-10 gap-2"
          role="listbox"
          aria-label="Solid color wallpapers"
        >
          {SOLID_COLOR_PRESETS.map((color, i) => {
            const dataUrl = SOLID_DATA_URL_MAP.get(color.hex)!;
            const isActive = wallpaper === dataUrl;
            return (
              <button
                key={color.hex}
                type="button"
                onClick={() => handleSelectSolid(color.hex)}
                aria-label={`Select color: ${color.name}`}
                aria-pressed={isActive}
                className={`relative aspect-square rounded-full overflow-hidden transition-all duration-150 ${
                  isActive
                    ? THUMB_RING_ACTIVE
                    : THUMB_RING_INACTIVE
                }`}
                style={{ backgroundColor: solidBaseColors[i] }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={handleCustomImage}
          aria-label="Upload custom wallpaper image"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium text-gray-700 dark:text-neutral-300 bg-white dark:bg-white/[0.04] transition-all duration-150 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white active:scale-[0.97]"
        >
          <SvgIcon svg={uploadSvg} size={14} />
          Upload Image
        </button>
        <button
          type="button"
          onClick={handleClear}
          aria-label="Remove current wallpaper"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium text-red-500 dark:text-red-400 bg-red-500/[0.06] dark:bg-red-400/[0.08] transition-all duration-150 hover:bg-red-500/[0.1] dark:hover:bg-red-400/[0.14] active:scale-[0.97]"
        >
          <SvgIcon svg={trashSvg} size={14} />
          Remove
        </button>
      </div>
    </div>
  );
}

export const WallpaperPane = memo(WallpaperPaneInner);
