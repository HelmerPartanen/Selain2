import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { Text } from "@/components/ui/Text";
import { GroupBox } from "@/components/ui/GroupBox";
import { useThemeStore } from "@/store/themeStore";
import { SOLID_COLOR_PRESETS } from "@/theme/presets";
import {
  BUNDLED_WALLPAPERS,
  generateThumbnail,
  resolveBundledWallpaperUrl,
} from "@/theme/bundledWallpapers";
import {
  DYNAMIC_WALLPAPER_KEY,
  type DynamicWallpaperMode,
  type DynamicWallpaperSet,
  getDynamicWallpaperLayers,
  getDynamicWallpaperMode,
  isDynamicWallpaperKey,
  loadDynamicWallpapers,
  setDynamicWallpaperMode,
  subscribeDynamicWallpaperMode,
} from "@/theme/dynamicWallpapers";
import { showToast } from "@/components/ui/toastStore";
import { logger } from "@/utils/logger";
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

const THUMB_BASE_CLASS =
  "relative flex-shrink-0 w-[180px] aspect-[16/10] rounded-lg overflow-hidden transition-all duration-150";
const THUMB_RING_ACTIVE =
  "ring-2 ring-[var(--app-accent)] ring-offset-2 ring-offset-[var(--app-bg-primary)]";
const THUMB_RING_INACTIVE =
  "ring-1 ring-[var(--app-separator)] hover:ring-[var(--app-accent)]";

function solidToDataUrl(hex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="${hex}"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

const SOLID_DATA_URL_MAP = new Map(
  SOLID_COLOR_PRESETS.map((color) => [color.hex, solidToDataUrl(color.hex)]),
);

const DYNAMIC_MODE_OPTIONS: Array<{
  mode: DynamicWallpaperMode;
  label: string;
}> = [
  { mode: "dynamic", label: "Automatic" },
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
];

function dynamicModeLabel(mode: DynamicWallpaperMode): string {
  return DYNAMIC_MODE_OPTIONS.find((option) => option.mode === mode)?.label ?? "Automatic";
}

const WallpaperThumb = memo(function WallpaperThumb({
  label,
  src,
  isActive,
  onSelect,
  children,
}: {
  label: string;
  src: string;
  isActive: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <Button
      size="none"
      variant="ghost"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={isActive}
      className={`${THUMB_BASE_CLASS} ${isActive ? THUMB_RING_ACTIVE : THUMB_RING_INACTIVE}`}
    >
      {src ? (
        <img
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[var(--app-bg-secondary)]" />
      )}
      {children}
    </Button>
  );
});

const BundledThumb = memo(function BundledThumb({
  storageKey,
  isActive,
  onSelect,
}: {
  storageKey: string;
  isActive: boolean;
  onSelect: (key: string) => void;
}): React.JSX.Element {
  const [thumbUrl, setThumbUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    resolveBundledWallpaperUrl(storageKey)
      .then((url) => generateThumbnail(url))
      .then((thumb) => {
        if (!cancelled) setThumbUrl(thumb);
      })
      .catch((err) => logger.warn("Failed to load wallpaper thumbnail:", err));
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  return (
    <WallpaperThumb
      label={`Select wallpaper ${storageKey.replace("bundled:", "")}`}
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
      .catch((err) => logger.warn("Failed to load dynamic wallpaper thumbnail:", err));
    return () => {
      cancelled = true;
    };
  }, [wallpaper.base]);

  return (
    <WallpaperThumb
      label={`Select dynamic wallpaper: ${wallpaper.name}`}
      src={thumbUrl}
      isActive={isActive}
      onSelect={() => onSelect(wallpaper.storageKey)}
    >
      <span className="pointer-events-none absolute right-1 top-1 z-10 flex items-center gap-1.5 rounded-lg border border-[var(--app-separator)] bg-[var(--app-bg-tertiary)] px-2 py-1 text-[10px] font-medium text-[var(--app-text-secondary)]">
        <SvgIcon svg={dynamicSvg} size={14} />
        Dynamic
      </span>
    </WallpaperThumb>
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
    <div className={`${THUMB_BASE_CLASS} ${isActive ? THUMB_RING_ACTIVE : THUMB_RING_INACTIVE}`}>
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
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
      </Button>
      <Button
        variant="icon"
        size="icon-sm"
        rounded="rounded-md"
        onClick={() => onRemove(item)}
        aria-label={`Remove custom wallpaper: ${item.name}`}
        className="absolute right-2 top-2 z-10 border border-[var(--app-separator)] bg-[var(--app-bg-tertiary)] text-[var(--app-text-primary)] hover:bg-[var(--app-control-hover)]"
      >
        <SvgIcon svg={trashSvg} size={13} />
      </Button>
    </div>
  );
});

const CurrentWallpaperPanel = memo(function CurrentWallpaperPanel({
  wallpaper,
  dynamicMode,
  onDynamicModeChange,
}: {
  wallpaper: string | null;
  dynamicMode: DynamicWallpaperMode;
  onDynamicModeChange: (mode: DynamicWallpaperMode) => void;
}): React.JSX.Element {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dynamicLayers, setDynamicLayers] = useState<{ url: string; opacity: number }[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDynamic = !!wallpaper && isDynamicWallpaperKey(wallpaper);

  useEffect(() => {
    if (!wallpaper || isDynamic) {
      setPreviewUrl(null);
      return;
    }

    if (wallpaper.startsWith("bundled:")) {
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

    if (wallpaper.startsWith("preset:")) {
      setPreviewUrl(null);
      return;
    }

    setPreviewUrl(wallpaper);
  }, [wallpaper, isDynamic]);

  useEffect(() => {
    if (!isDynamic || !wallpaper) {
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

  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: PointerEvent): void => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setIsMenuOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isMenuOpen]);

  return (
    <GroupBox title="Current background">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative aspect-[16/10] w-full flex-shrink-0 overflow-hidden rounded-xl bg-[var(--app-bg-secondary)] ring-1 ring-[var(--app-separator)] sm:w-[260px]">
          {isDynamic ? (
            dynamicLayers.map((layer) => (
              <div
                key={layer.url}
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${layer.url})`, opacity: layer.opacity }}
              />
            ))
          ) : previewUrl ? (
            <img src={previewUrl} alt="" aria-hidden draggable={false} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[var(--bg-solid-fallback)]" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
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
                  <SvgIcon svg={chevronDownSvg} size={12} />
                </Button>
                {isMenuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-[calc(100%+6px)] z-20 flex min-w-36 flex-col gap-1 rounded-xl border border-[var(--app-separator)] bg-[var(--app-bg-tertiary)] p-1 shadow-sm"
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
                            ? "bg-[var(--app-control-active)] text-[var(--app-text-primary)]"
                            : "text-[var(--app-text-secondary)]"
                        }`}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <Text size="caption" tone="muted" className="max-w-sm">
                Automatic mode changes the background through the day.
              </Text>
            </>
          ) : (
            <Text size="caption" tone="muted" className="max-w-sm">
              Choose a dynamic background to enable automatic light and dark behavior.
            </Text>
          )}
        </div>
      </div>
    </GroupBox>
  );
});

function WallpaperPaneInner(): React.JSX.Element {
  const wallpaper = useThemeStore((s) => s.wallpaper);
  const setWallpaper = useThemeStore((s) => s.setWallpaper);
  const [customWallpapers, setCustomWallpapers] = useState<CustomWallpaper[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dynamicMode, setDynamicModeState] = useState<DynamicWallpaperMode>(() => getDynamicWallpaperMode());
  const [dynamicWallpapers, setDynamicWallpapers] = useState<DynamicWallpaperSet[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadDynamicWallpapers()
      .then((sets) => {
        if (!cancelled) setDynamicWallpapers(sets);
      })
      .catch((err) => logger.warn("Failed to load dynamic wallpapers:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => subscribeDynamicWallpaperMode(() => {
    setDynamicModeState(getDynamicWallpaperMode());
  }), []);

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

  const handleSelectWallpaper = useCallback((value: string) => {
    void setWallpaper(value);
  }, [setWallpaper]);

  const handleSelectSolid = useCallback((hex: string) => {
    const dataUrl = SOLID_DATA_URL_MAP.get(hex);
    if (dataUrl) void setWallpaper(dataUrl);
  }, [setWallpaper]);

  const handleDynamicModeChange = useCallback((mode: DynamicWallpaperMode) => {
    setDynamicModeState(mode);
    setDynamicWallpaperMode(mode);
  }, []);

  const handleCustomImage = useCallback(async () => {
    if (isUploading) return;
    setIsUploading(true);
    try {
      const item = await window.electronAPI.importWallpaper();
      if (!item) return;
      setCustomWallpapers((items) => [item, ...items.filter((wp) => wp.id !== item.id)]);
      const saved = await setWallpaper(item.url);
      showToast({ message: saved ? "Background updated" : "Background could not be saved", type: saved ? "success" : "error" });
    } catch (err) {
      logger.error("Failed to import wallpaper:", err);
      showToast({ message: "Failed to set background", type: "error" });
    } finally {
      setIsUploading(false);
    }
  }, [isUploading, setWallpaper]);

  const handleRemoveCustom = useCallback(async (item: CustomWallpaper) => {
    const deleted = await window.electronAPI.deleteCustomWallpaper(item.id);
    if (!deleted) {
      showToast({ message: "Failed to remove background", type: "error" });
      return;
    }
    setCustomWallpapers((items) => items.filter((wp) => wp.id !== item.id));
    if (wallpaper === item.url) {
      const cleared = await setWallpaper(null);
      if (cleared) showToast({ message: "Background removed", type: "info" });
    }
  }, [setWallpaper, wallpaper]);

  const handleClear = useCallback(async () => {
    const saved = await setWallpaper(null);
    showToast({ message: saved ? "Background removed" : "Failed to remove background", type: saved ? "info" : "error" });
  }, [setWallpaper]);

  return (
    <div className="space-y-6">
      <CurrentWallpaperPanel
        wallpaper={wallpaper}
        dynamicMode={dynamicMode}
        onDynamicModeChange={handleDynamicModeChange}
      />

      <GroupBox title="Wallpapers">
        <div className="-m-1.5 flex gap-2.5 overflow-x-auto p-1.5 glass-scroll" role="listbox" aria-label="Wallpapers">
          {dynamicWallpapers.map((dynamicWallpaper) => (
            <DynamicThumb
              key={dynamicWallpaper.storageKey}
              wallpaper={dynamicWallpaper}
              isActive={
                wallpaper === dynamicWallpaper.storageKey ||
                (wallpaper === "dynamic:day-cycle" && dynamicWallpaper.storageKey === DYNAMIC_WALLPAPER_KEY)
              }
              onSelect={handleSelectWallpaper}
            />
          ))}
          {BUNDLED_WALLPAPERS.map((wp) => (
            <BundledThumb
              key={wp.filename}
              storageKey={wp.storageKey}
              isActive={wallpaper === wp.storageKey}
              onSelect={handleSelectWallpaper}
            />
          ))}
        </div>
      </GroupBox>

      <GroupBox title="Colors">
        <div className="grid grid-cols-10 gap-2" role="listbox" aria-label="Background colors">
          {SOLID_COLOR_PRESETS.map((color) => {
            const dataUrl = SOLID_DATA_URL_MAP.get(color.hex) ?? "";
            const isActive = wallpaper === dataUrl;
            return (
              <Button
                key={color.hex}
                size="none"
                variant="ghost"
                onClick={() => handleSelectSolid(color.hex)}
                aria-label={`Select color: ${color.name}`}
                aria-pressed={isActive}
                title={color.name}
                className={`relative aspect-square overflow-hidden rounded-lg transition-all duration-150 ${
                  isActive ? THUMB_RING_ACTIVE : THUMB_RING_INACTIVE
                }`}
                style={{ backgroundColor: color.hex }}
              />
            );
          })}
        </div>
      </GroupBox>

      {customWallpapers.length > 0 && (
        <GroupBox title="Custom images">
          <div className="-m-1.5 flex gap-2.5 overflow-x-auto p-1.5 glass-scroll" role="listbox" aria-label="Custom backgrounds">
            {customWallpapers.map((item) => (
              <CustomThumb
                key={item.id}
                item={item}
                isActive={wallpaper === item.url}
                onSelect={handleSelectWallpaper}
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
            aria-label="Upload custom background image"
            className="flex-1"
          >
            <SvgIcon svg={uploadSvg} size={14} />
            {isUploading ? "Importing..." : "Upload image"}
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={handleClear}
            aria-label="Remove current background"
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
