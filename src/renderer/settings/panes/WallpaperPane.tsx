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
} from "@/theme/bundledWallpapers";
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

// --- Lazy Wallpaper Thumbnail ------------------------------------------------

function LazyWallpaperThumb({
  url,
  storageKey,
  isActive,
  onSelect,
}: {
  url: string;
  storageKey: string;
  isActive: boolean;
  onSelect: (key: string) => void;
}): React.JSX.Element {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const node = buttonRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    generateThumbnail(url).then((t) => {
      if (!cancelled) setThumbUrl(t);
    });
    return () => {
      cancelled = true;
    };
  }, [url, shouldLoad]);

  return (
    <button
      ref={buttonRef}
      onClick={() => onSelect(storageKey)}
      aria-label={`Select wallpaper ${storageKey.replace("bundled:", "")}`}
      aria-pressed={isActive}
      className={`relative flex-shrink-0 w-[140px] aspect-[16/10] rounded-xl overflow-hidden transition-all duration-150 ${
        isActive
          ? "ring-2 ring-indigo-500/60 dark:ring-indigo-400/60 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900"
          : "ring-1 ring-black/[0.06] dark:ring-white/[0.06] hover:ring-black/[0.12] dark:hover:ring-white/[0.12]"
      }`}
      style={{
        backgroundImage: thumbUrl ? `url(${thumbUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: thumbUrl ? undefined : "rgb(38 38 38)",
      }}
    />
  );
}

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
            <LazyWallpaperThumb
              key={wp.filename}
              url={wp.url}
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
            const isActive = wallpaper === presetKey;
            const thumbUrl = isDark ? preset.dark : preset.light;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectGradient(preset.id)}
                aria-label={`Select gradient: ${preset.name}`}
                aria-pressed={isActive}
                className={`relative flex-shrink-0 w-[140px] aspect-[16/10] rounded-xl overflow-hidden transition-all duration-150 ${
                  isActive
                    ? "ring-2 ring-indigo-500/60 dark:ring-indigo-400/60 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900"
                    : "ring-1 ring-black/[0.06] dark:ring-white/[0.06] hover:ring-black/[0.12] dark:hover:ring-white/[0.12]"
                }`}
                style={{
                  backgroundImage: `url(${thumbUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
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
            const isActive = wallpaper === SOLID_DATA_URL_MAP.get(color.hex);
            return (
              <button
                key={color.hex}
                onClick={() => handleSelectSolid(color.hex)}
                aria-label={`Select color: ${color.name}`}
                aria-pressed={isActive}
                className={`relative aspect-square rounded-full overflow-hidden transition-all duration-150 ${
                  isActive
                    ? "ring-2 ring-indigo-500/60 dark:ring-indigo-400/60 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900"
                    : "ring-1 ring-black/[0.06] dark:ring-white/[0.06] hover:ring-black/[0.12] dark:hover:ring-white/[0.12]"
                }`}
                style={{ backgroundColor: solidBaseColors[i] }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          onClick={handleCustomImage}
          aria-label="Upload custom wallpaper image"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[12px] font-medium text-gray-600 dark:text-neutral-300 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] transition-all duration-150 hover:bg-black/[0.06] dark:hover:bg-white/[0.07] hover:text-gray-900 dark:hover:text-white active:scale-[0.97]"
        >
          <SvgIcon svg={uploadSvg} size={14} />
          Upload Image
        </button>
        <button
          onClick={handleClear}
          aria-label="Remove current wallpaper"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[12px] font-medium text-red-500 dark:text-red-400 border border-red-500/20 dark:border-red-400/20 bg-red-500/[0.06] dark:bg-red-400/[0.08] transition-all duration-150 hover:bg-red-500/[0.1] dark:hover:bg-red-400/[0.14] active:scale-[0.97]"
        >
          <SvgIcon svg={trashSvg} size={14} />
          Remove
        </button>
      </div>
    </div>
  );
}

export const WallpaperPane = memo(WallpaperPaneInner);
