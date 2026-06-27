// ─── Wallpaper Settings Pane ─────────────────────────────────────────────────

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { Text } from "@/components/ui/Text";

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
  type DynamicWallpaperSet,
  type DynamicWallpaperMode,
  getDynamicWallpaperLayers,
  getDynamicWallpaperMode,
  isDynamicWallpaperKey,
  loadDynamicWallpapers,
  setDynamicWallpaperMode,
  subscribeDynamicWallpaperMode,
} from "@/theme/dynamicWallpapers";
import { getPresetThumbnailUrl } from "@/theme/presetThumbnails";
import { showToast } from "@/components/ui/toastStore";
import { logger } from "@/utils/logger";
import { useIsDark } from "@/hooks/useIsDark";
import uploadSvg from "@/assets/icons/Objects/Tray_Arrow_Up.svg?raw";
import trashSvg from "@/assets/icons/Objects/Trash.svg?raw";
import chevronDownSvg from "@/assets/icons/Arrows/Chevron_Down.svg?raw";
import dynamicSvg from "@/assets/icons/Weather/Dynamic.svg?raw";
import { GroupBox } from "@/components/ui/GroupBox";

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
  "ring-2 ring-[var(--app-accent)] ring-offset-2 ring-offset-[var(--app-bg-primary)]";
const THUMB_RING_INACTIVE =
  "ring-1 ring-[var(--app-separator)] hover:ring-[var(--app-accent)]";
const DYNAMIC_MODE_OPTIONS: Array<{
  mode: DynamicWallpaperMode;
  label: string;
}> = [
  { mode: "dynamic", label: "Dynamic" },
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
];

function dynamicModeLabel(mode: DynamicWallpaperMode): string {
  return (
    DYNAMIC_MODE_OPTIONS.find((option) => option.mode === mode)?.label ??
    "Dynamic"
  );
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
    <Button
      size="none"
      variant="ghost"
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
    </Button>
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
  wallpaper,
  isActive,
  onSelect,
}: {
  wallpaper: DynamicWallpaperSet;
  isActive: boolean;
  onSelect: (key: string) => void;
}): React.JSX.Element {
  const [thumbUrl, setThumbUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    generateThumbnail(wallpaper.base)
      .then((thumb) => {
        if (!cancelled) setThumbUrl(thumb);
      })
      .catch((err) => {
        logger.warn("Failed to load dynamic wallpaper thumb:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [wallpaper.base]);

  return (
    <div className="relative flex-shrink-0">
      <LazyThumb
        alt={`Select dynamic wallpaper: ${wallpaper.name}`}
        src={thumbUrl}
        isActive={isActive}
        onSelect={() => onSelect(wallpaper.storageKey)}
      />
      <div className="pointer-events-none absolute right-1 top-1 z-10 flex items-center gap-1.5 rounded-lg bg-[var(--app-bg-tertiary)] px-2 py-1 text-[10px] font-medium text-[var(--app-text-secondary)] border border-[var(--app-separator)]">
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
      <Button
        size="none"
        variant="ghost"
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
      </Button>
      <Button
        variant="icon"
        size="icon-sm"
        rounded="rounded-full"
        onClick={() => onRemove(item)}
        aria-label={`Remove custom wallpaper: ${item.name}`}
        className="absolute right-2 top-2 z-10 bg-[var(--app-bg-tertiary)] text-[var(--app-text-primary)] border border-[var(--app-separator)] hover:bg-[var(--app-control-hover)]"
      >
        <SvgIcon svg={trashSvg} size={13} />
      </Button>
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

  const [dynamicLayers, setDynamicLayers] = useState<
    { url: string; opacity: number }[]
  >([]);

  useEffect(() => {
    if (!isDynamic) {
      setDynamicLayers([]);
      return;
    }
    let cancelled = false;
    getDynamicWallpaperLayers(wallpaper, new Date(), dynamicMode)
      .then((layers) => {
        if (!cancelled) setDynamicLayers(layers);
      })
      .catch((err) => {
        logger.warn("Failed to resolve dynamic wallpaper preview:", err);
        if (!cancelled) setDynamicLayers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isDynamic, wallpaper, dynamicMode]);

  return (
    <div className="space-y-3">
      <GroupBox title="Current Wallpaper">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative w-full sm:w-[260px] flex-shrink-0 aspect-[16/10] overflow-hidden rounded-xl bg-[var(--app-bg-secondary)] ring-1 ring-[var(--app-separator)]">
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
            <div className="absolute inset-0 bg-[var(--bg-solid-fallback)]" />
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col justify-center gap-2">
          {isDynamic ? (
            <>
              <div ref={menuRef} className="relative self-start">
                <Button
                  variant="solid"
                  size="sm"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                >
                  <span>{dynamicModeLabel(dynamicMode)}</span>
                  <SvgIcon
                    svg={chevronDownSvg}
                    size={12}
                    className={`transition-transform duration-150 ${isMenuOpen ? "rotate-180" : ""}`}
                  />
                </Button>
                {isMenuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-[calc(100%+6px)] z-20 flex min-w-36 flex-col gap-1 rounded-xl p-1 shadow-sm bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)]"
                  >
                    {DYNAMIC_MODE_OPTIONS.map((option) => (
                      <Button
                        key={option.mode}
                        variant="ghost"
                        size="sm"
                        role="menuitemradio"
                        aria-checked={dynamicMode === option.mode}
                        onClick={() => {
                          onDynamicModeChange(option.mode);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full justify-start text-left ${
                          dynamicMode === option.mode
                            ? "text-[var(--app-text-primary)] bg-[var(--app-control-active)]"
                            : "text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-[var(--app-control-hover)]"
                        }`}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <Text size="caption" tone="muted" className="max-w-sm">
                Dynamic mode blends between morning, daylight, evening, and
                night wallpapers based on the current time.
              </Text>
            </>
          ) : (
            <Text size="caption" tone="muted" className="max-w-sm">
              Select a dynamic wallpaper to choose automatic, light, or dark
              behavior.
            </Text>
          )}
        </div>
      </div>
      </GroupBox>
    </div>
  );
});

// --- Wallpaper Pane ----------------------------------------------------------

function WallpaperPaneInner(): React.JSX.Element {
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const setWallpaper = useThemeStore((s) => s.setWallpaper);
  const isDark = useIsDark();
  const [customWallpapers, setCustomWallpapers] = useState<CustomWallpaper[]>(
    [],
  );
  const [isUploading, setIsUploading] = useState(false);
  const [dynamicMode, setDynamicModeState] = useState<DynamicWallpaperMode>(
    () => getDynamicWallpaperMode(),
  );
  const [dynamicWallpapers, setDynamicWallpapers] = useState<
    DynamicWallpaperSet[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    loadDynamicWallpapers()
      .then((sets) => {
        if (!cancelled) setDynamicWallpapers(sets);
      })
      .catch((err) => {
        logger.warn("Failed to load dynamic wallpapers:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        setCustomWallpapers((items) => [
          item,
          ...items.filter((wp) => wp.id !== item.id),
        ]);
        const saved = await setWallpaper(item.url);
        if (!saved) {
          showToast({ message: "Wallpaper could not be saved", type: "error" });
          return;
        }
        showToast({ message: "Wallpaper updated", type: "success" });
      }
    } catch (err) {
      logger.error("Failed to open image dialog:", err);
      showToast({ message: "Failed to set wallpaper", type: "error" });
    } finally {
      setIsUploading(false);
    }
  }, [isUploading, setWallpaper]);

  const handleRemoveCustom = useCallback(
    async (item: CustomWallpaper) => {
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
    },
    [setWallpaper, wallpaper],
  );

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

      <GroupBox title="Wallpapers">
        <div
          className="flex gap-2.5 overflow-x-auto p-1.5 -m-1.5 glass-scroll"
          role="listbox"
          aria-label="Bundled wallpapers"
        >
          {dynamicWallpapers.map((dynamicWallpaper) => (
            <DynamicThumb
              key={dynamicWallpaper.storageKey}
              wallpaper={dynamicWallpaper}
              isActive={
                wallpaper === dynamicWallpaper.storageKey ||
                (wallpaper === "dynamic:day-cycle" &&
                  dynamicWallpaper.storageKey === DYNAMIC_WALLPAPER_KEY)
              }
              onSelect={handleSelectPreset}
            />
          ))}
          {BUNDLED_WALLPAPERS.map((wp) => (
            <BundledThumb
              key={wp.filename}
              storageKey={wp.storageKey}
              isActive={wallpaper === wp.storageKey}
              onSelect={handleSelectPreset}
            />
          ))}
        </div>
      </GroupBox>

      <GroupBox title="Gradients">
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
      </GroupBox>

      <GroupBox title="Solid Colors">
        <div
          className="grid grid-cols-10 gap-2"
          role="listbox"
          aria-label="Solid color wallpapers"
        >
          {SOLID_COLOR_PRESETS.map((color, i) => {
            const dataUrl = SOLID_DATA_URL_MAP.get(color.hex)!;
            const isActive = wallpaper === dataUrl;
            return (
              <Button
                key={color.hex}
                size="none"
                variant="ghost"
                onClick={() => handleSelectSolid(color.hex)}
                aria-label={`Select color: ${color.name}`}
                aria-pressed={isActive}
                className={`relative aspect-square rounded-full overflow-hidden transition-all duration-150 ${
                  isActive ? THUMB_RING_ACTIVE : THUMB_RING_INACTIVE
                }`}
                style={{ backgroundColor: solidBaseColors[i] }}
              />
            );
          })}
        </div>
      </GroupBox>

      {customWallpapers.length > 0 && (
        <GroupBox title="Custom">
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
        </GroupBox>
      )}

      <GroupBox>
      <div className="flex gap-2.5">
        <Button
          variant="ghost"
          size="md"
          onClick={handleCustomImage}
          disabled={isUploading}
          aria-label="Upload custom wallpaper image"
          className="flex-1"
        >
          <SvgIcon svg={uploadSvg} size={14} />
          {isUploading ? "Importing..." : "Upload Image"}
        </Button>
        <Button
          variant="danger"
          size="md"
          onClick={handleClear}
          aria-label="Remove current wallpaper"
          className="flex-1"
        >
          <SvgIcon svg={trashSvg} size={14} />
          Remove
        </Button>
      </div>
      </GroupBox>
    </div>
  );
}

export const WallpaperPane = memo(WallpaperPaneInner);
