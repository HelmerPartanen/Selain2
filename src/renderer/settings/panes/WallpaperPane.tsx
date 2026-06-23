// ─── Wallpaper Settings Pane ─────────────────────────────────────────────────

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { SectionHeader } from "@/settings/components/SettingsShared";
import { useThemeStore } from "@/store/themeStore";
import {
  WALLPAPER_PRESETS,
  SOLID_COLOR_PRESETS,
  PRESET_PREFIX,
  isPresetKey,
  resolvePresetUrl,
} from "@/theme/presets";
import {
  BUNDLED_WALLPAPERS,
  generateThumbnail,
  isBundledKey,
  resolveBundledWallpaperUrl,
} from "@/theme/bundledWallpapers";
import {
  DYNAMIC_WALLPAPER_KEY,
  type DynamicWallpaperMode,
  getDynamicWallpaperLayers,
  getDynamicWallpaperMode,
  isDynamicWallpaperKey,
  resolveDynamicWallpaperUrls,
  setDynamicWallpaperMode,
  subscribeDynamicWallpaperMode,
} from "@/theme/dynamicWallpapers";
import { getPresetThumbnailUrl } from "@/theme/presetThumbnails";
import { showToast } from "@/components/ui/Toast";
import { logger } from "@/utils/logger";
import { useIsDark } from "@/hooks/useIsDark";
import uploadSvg from "@/assets/icons/Objects/Tray_Arrow_Up.svg?raw";
import trashSvg from "@/assets/icons/Objects/Trash.svg?raw";
import chevronDownSvg from "@/assets/icons/Arrows/Chevron_Down.svg?raw";
import dynamicSvg from "@/assets/icons/Weather/Dynamic.svg?raw";

interface CustomWallpaper {
  id: string;
  name: string;
  url: string;
  createdAt: number;
}

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
const DYNAMIC_MODE_OPTIONS: Array<{ mode: DynamicWallpaperMode; label: string }> = [
  { mode: "dynamic", label: "Dynamic" },
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
];

function dynamicModeLabel(mode: DynamicWallpaperMode): string {
  return DYNAMIC_MODE_OPTIONS.find((option) => option.mode === mode)?.label ?? "Dynamic";
}

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

const DynamicThumb = memo(function DynamicThumb({
  isActive,
  onSelect,
}: {
  isActive: boolean;
  onSelect: (key: string) => void;
}): React.JSX.Element {
  const [thumbUrl, setThumbUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    generateThumbnail(resolveDynamicWallpaperUrls().base)
      .then((thumb) => {
        if (!cancelled) setThumbUrl(thumb);
      })
      .catch((err) => {
        logger.warn("Failed to load dynamic wallpaper thumb:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative flex-shrink-0">
      <LazyThumb
        alt="Select dynamic wallpaper"
        src={thumbUrl}
        isActive={isActive}
        onSelect={() => onSelect(DYNAMIC_WALLPAPER_KEY)}
      />
      <div className="pointer-events-none absolute right-1 top-1 z-10 flex items-center gap-1.5 rounded-lg bg-white/85 px-2 py-1 text-[10px] font-medium text-gray-700 backdrop-blur-sm dark:bg-black/70 dark:text-neutral-200">
        <SvgIcon svg={dynamicSvg} size={16} />
      </div>
    </div>
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

const CustomThumb = memo(function CustomThumb({
  item,
  isActive,
  onSelect,
  onRemove,
}: {
  item: CustomWallpaper;
  isActive: boolean;
  onSelect: (url: string) => void;
  onRemove: (item: CustomWallpaper) => void;
}): React.JSX.Element {
  return (
    <div
      className={`${THUMB_BASE_CLASS} ${
        isActive ? THUMB_RING_ACTIVE : THUMB_RING_INACTIVE
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(item.url)}
        aria-label={`Select custom wallpaper: ${item.name}`}
        aria-pressed={isActive}
        className="absolute inset-0"
      >
        <img
          src={item.url}
          alt=""
          aria-hidden
          draggable={false}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover select-none"
        />
      </button>
      <button
        type="button"
        onClick={() => onRemove(item)}
        aria-label={`Remove custom wallpaper: ${item.name}`}
        className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors duration-150 hover:bg-black/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
      >
        <SvgIcon svg={trashSvg} size={13} />
      </button>
    </div>
  );
});

const CurrentWallpaperPanel = memo(function CurrentWallpaperPanel({
  wallpaper,
  isDark,
  dynamicMode,
  onDynamicModeChange,
}: {
  wallpaper: string | null;
  isDark: boolean;
  dynamicMode: DynamicWallpaperMode;
  onDynamicModeChange: (mode: DynamicWallpaperMode) => void;
}): React.JSX.Element {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDynamic = !!wallpaper && isDynamicWallpaperKey(wallpaper);

  useEffect(() => {
    if (!wallpaper || isDynamicWallpaperKey(wallpaper)) {
      setPreviewUrl(null);
      return;
    }

    if (isPresetKey(wallpaper)) {
      setPreviewUrl(resolvePresetUrl(wallpaper, isDark));
      return;
    }

    if (isBundledKey(wallpaper)) {
      let cancelled = false;
      resolveBundledWallpaperUrl(wallpaper)
        .then((url) => {
          if (!cancelled) setPreviewUrl(url);
        })
        .catch((err) => {
          logger.warn("Failed to resolve current wallpaper preview:", err);
          if (!cancelled) setPreviewUrl(null);
        });
      return () => {
        cancelled = true;
      };
    }

    setPreviewUrl(wallpaper);
  }, [wallpaper, isDark]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: PointerEvent): void => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setIsMenuOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isMenuOpen]);

  const dynamicLayers = useMemo(() => {
    if (!isDynamic) return [];
    return getDynamicWallpaperLayers(new Date(), dynamicMode);
  }, [isDynamic, dynamicMode]);

  return (
    <div className="space-y-3">
      <SectionHeader className="mb-0">Current Wallpaper</SectionHeader>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative w-full sm:w-[260px] flex-shrink-0 aspect-[16/10] overflow-hidden rounded-xl bg-black/[0.06] dark:bg-white/[0.06] ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
          {isDynamic ? (
            dynamicLayers.map((layer) => (
              <div
                key={layer.url}
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url(${layer.url})`,
                  opacity: layer.opacity,
                  transition: "opacity 220ms ease-out",
                }}
              />
            ))
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              aria-hidden
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gray-100 dark:bg-neutral-900" />
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-center gap-2">
          {isDynamic ? (
            <>
              <div ref={menuRef} className="relative self-start">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium text-gray-700 dark:text-neutral-300 bg-white dark:bg-white/[0.04] transition-all duration-150 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
                >
                  <span>{dynamicModeLabel(dynamicMode)}</span>
                  <SvgIcon svg={chevronDownSvg} size={12} className={`transition-transform duration-150 ${isMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {isMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-[calc(100%+6px)] z-20 flex min-w-36 flex-col gap-1 rounded-xl p-1 shadow-sm bg-white/90 dark:bg-[#1D1F23]/80 backdrop-blur-xl border border-black/5 dark:border-white/5"
              >
                    {DYNAMIC_MODE_OPTIONS.map((option) => (
                      <button
                        key={option.mode}
                        type="button"
                        role="menuitemradio"
                        aria-checked={dynamicMode === option.mode}
                        onClick={() => {
                          onDynamicModeChange(option.mode);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[12px] font-normal transition-all duration-150 ${
                          dynamicMode === option.mode
                            ? "text-gray-700 dark:text-white bg-black/[0.08] dark:bg-white/[0.10]"
                            : "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-gray-400 dark:text-neutral-500 leading-relaxed max-w-sm">
                Dynamic mode blends between morning, daylight, evening, and night wallpapers based on the current time.
              </p>
            </>
          ) : (
            <p className="text-[11px] text-gray-400 dark:text-neutral-500 leading-relaxed max-w-sm">
              Select a dynamic wallpaper to choose automatic, light, or dark behavior.
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

// --- Wallpaper Pane ----------------------------------------------------------

function WallpaperPaneInner(): React.JSX.Element {
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const setWallpaper = useThemeStore((s) => s.setWallpaper);
  const isDark = useIsDark();
  const [customWallpapers, setCustomWallpapers] = useState<CustomWallpaper[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dynamicMode, setDynamicModeState] = useState<DynamicWallpaperMode>(() =>
    getDynamicWallpaperMode(),
  );

  const handleSelectPreset = useCallback(
    (dataUrl: string) => {
      void setWallpaper(dataUrl);
    },
    [setWallpaper],
  );

  const handleSelectGradient = useCallback(
    (presetId: string) => {
      void setWallpaper(`${PRESET_PREFIX}${presetId}`);
    },
    [setWallpaper],
  );

  const handleSelectSolid = useCallback(
    (hex: string) => {
      const dataUrl = SOLID_DATA_URL_MAP.get(hex);
      if (dataUrl) void setWallpaper(dataUrl);
    },
    [setWallpaper],
  );

  const refreshCustomWallpapers = useCallback(async () => {
    try {
      setCustomWallpapers(await window.electronAPI.listCustomWallpapers());
    } catch (err) {
      logger.warn("Failed to list custom wallpapers:", err);
      setCustomWallpapers([]);
    }
  }, []);

  useEffect(() => {
    void refreshCustomWallpapers();
  }, [refreshCustomWallpapers]);

  useEffect(() => {
    return subscribeDynamicWallpaperMode(() => {
      setDynamicModeState(getDynamicWallpaperMode());
    });
  }, []);

  const handleDynamicModeChange = useCallback((mode: DynamicWallpaperMode) => {
    setDynamicModeState(mode);
    setDynamicWallpaperMode(mode);
  }, []);

  const handleCustomImage = useCallback(async () => {
    if (isUploading) return;
    setIsUploading(true);
    try {
      const item = await window.electronAPI.importWallpaper();
      if (item) {
        setCustomWallpapers((items) => [item, ...items.filter((wp) => wp.id !== item.id)]);
        const saved = await setWallpaper(item.url);
        if (!saved) {
          showToast({ message: "Wallpaper could not be saved", type: "error" });
          return;
        }
        showToast({ message: "Wallpaper updated", type: "success" });
      }
    } catch (err) {
      logger.error("Failed to open image dialog:", err)
      showToast({ message: "Failed to set wallpaper", type: "error" });
    } finally {
      setIsUploading(false);
    }
  }, [isUploading, setWallpaper]);

  const handleRemoveCustom = useCallback(async (item: CustomWallpaper) => {
    const deleted = await window.electronAPI.deleteCustomWallpaper(item.id);
    if (!deleted) {
      showToast({ message: "Failed to remove wallpaper", type: "error" });
      return;
    }

    setCustomWallpapers((items) => items.filter((wp) => wp.id !== item.id));
    if (wallpaper === item.url) {
      const cleared = await setWallpaper(null);
      if (cleared) showToast({ message: "Wallpaper removed", type: "info" });
    }
  }, [setWallpaper, wallpaper]);

  const handleClear = useCallback(async () => {
    const saved = await setWallpaper(null);
    if (saved) {
      showToast({ message: "Wallpaper removed", type: "info" });
    } else {
      showToast({ message: "Failed to remove wallpaper", type: "error" });
    }
  }, [setWallpaper]);

  // Note: we intentionally do NOT clear the bundled or preset thumbnail
  // caches on unmount. Both caches are tiny (<20 small blob URLs) and
  // surviving across settings open/close means re-opens are instant.

  return (
    <div className="space-y-6">
      <CurrentWallpaperPanel
        wallpaper={wallpaper}
        isDark={isDark}
        dynamicMode={dynamicMode}
        onDynamicModeChange={handleDynamicModeChange}
      />

      <div>
        <SectionHeader className="mb-3">Wallpapers</SectionHeader>
        <div
          className="flex gap-2.5 overflow-x-auto p-1.5 -m-1.5 glass-scroll"
          role="listbox"
          aria-label="Bundled wallpapers"
        >
          <DynamicThumb
            isActive={wallpaper === DYNAMIC_WALLPAPER_KEY}
            onSelect={handleSelectPreset}
          />
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

      {customWallpapers.length > 0 && (
        <div>
          <SectionHeader className="mb-3">Custom</SectionHeader>
          <div
            className="flex gap-2.5 overflow-x-auto p-1.5 -m-1.5 glass-scroll"
            role="listbox"
            aria-label="Custom wallpapers"
          >
            {customWallpapers.map((item) => (
              <CustomThumb
                key={item.id}
                item={item}
                isActive={wallpaper === item.url}
                onSelect={handleSelectPreset}
                onRemove={handleRemoveCustom}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={handleCustomImage}
          disabled={isUploading}
          aria-label="Upload custom wallpaper image"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-medium text-gray-700 dark:text-neutral-300 bg-white dark:bg-white/[0.04] transition-all duration-150 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
        >
          <SvgIcon svg={uploadSvg} size={14} />
          {isUploading ? "Importing..." : "Upload Image"}
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
