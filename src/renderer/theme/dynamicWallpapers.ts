const dynamicModules = import.meta.glob<{ default: string }>(
  "@/assets/wallpapers/dynamic/Wallpaper_{Base,Dark,Light}_*.{jpg,jpeg,png,webp}",
  { eager: true },
);

const DYNAMIC_PREFIX = "dynamic:";
const MODE_STORAGE_KEY = "dynamic-wallpaper-mode";
const MODE_EVENT = "dynamic-wallpaper-mode-change";

export type DynamicWallpaperMode = "dynamic" | "light" | "dark";

export interface DynamicWallpaperSet {
  id: string;
  name: string;
  storageKey: string;
  base: string;
  dark: string;
  light: string;
}

export interface DynamicWallpaperLayer {
  url: string;
  opacity: number;
}

interface DynamicWallpaperDraft {
  id: string;
  name: string;
  base?: string;
  dark?: string;
  light?: string;
}

interface CompleteDynamicWallpaperDraft extends DynamicWallpaperDraft {
  base: string;
  dark: string;
  light: string;
}

function formatName(id: string): string {
  return id
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const drafts = new Map<string, DynamicWallpaperDraft>();

for (const [path, module] of Object.entries(dynamicModules)) {
  const filename = path.split("/").pop() ?? "";
  const match = /^Wallpaper_(Base|Dark|Light)_(.+)\.(?:jpe?g|png|webp)$/i.exec(
    filename,
  );
  if (!match) continue;

  const variant = match[1]!.toLowerCase() as "base" | "dark" | "light";
  const name = match[2]!;
  const id = normalizeId(name);
  const draft = drafts.get(id) ?? { id, name: formatName(name) };
  draft[variant] = module.default;
  drafts.set(id, draft);
}

export const DYNAMIC_WALLPAPERS: DynamicWallpaperSet[] = [...drafts.values()]
  .filter((draft): draft is CompleteDynamicWallpaperDraft => {
    return !!draft.base && !!draft.dark && !!draft.light;
  })
  .map((draft) => ({
    id: draft.id,
    name: draft.name,
    storageKey: `${DYNAMIC_PREFIX}${draft.id}`,
    base: draft.base,
    dark: draft.dark,
    light: draft.light,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const DYNAMIC_WALLPAPER_KEY =
  DYNAMIC_WALLPAPERS[0]?.storageKey ?? `${DYNAMIC_PREFIX}default`;

export function isDynamicWallpaperKey(value: string): boolean {
  return value.startsWith(DYNAMIC_PREFIX);
}

export function resolveDynamicWallpaperSet(
  storageKey: string | null,
): DynamicWallpaperSet | null {
  if (!storageKey || !isDynamicWallpaperKey(storageKey)) return null;
  return (
    DYNAMIC_WALLPAPERS.find(
      (wallpaper) => wallpaper.storageKey === storageKey,
    ) ?? null
  );
}

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function blend(startHour: number, endHour: number, hour: number): number {
  return smoothstep((hour - startHour) / (endHour - startHour));
}

function normalizeHour(hour: number): number {
  return ((hour % 24) + 24) % 24;
}

export function getDynamicWallpaperHour(date = new Date()): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

export function getDynamicWallpaperMode(): DynamicWallpaperMode {
  if (typeof window === "undefined") return "dynamic";
  const raw = window.localStorage.getItem(MODE_STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "dynamic"
    ? raw
    : "dynamic";
}

export function setDynamicWallpaperMode(mode: DynamicWallpaperMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  window.dispatchEvent(new Event(MODE_EVENT));
}

export function subscribeDynamicWallpaperMode(
  callback: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent): void => {
    if (event.key === MODE_STORAGE_KEY) callback();
  };
  window.addEventListener(MODE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(MODE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function getDynamicWallpaperLayers(
  storageKey: string | null,
  time: Date | number = new Date(),
  mode: DynamicWallpaperMode = "dynamic",
): DynamicWallpaperLayer[] {
  const wallpaper =
    resolveDynamicWallpaperSet(storageKey) ?? DYNAMIC_WALLPAPERS[0];
  if (!wallpaper) return [];

  if (mode === "dark") {
    return [
      { url: wallpaper.dark, opacity: 1 },
      { url: wallpaper.base, opacity: 0 },
      { url: wallpaper.light, opacity: 0 },
    ];
  }
  if (mode === "light") {
    return [
      { url: wallpaper.dark, opacity: 0 },
      { url: wallpaper.base, opacity: 0 },
      { url: wallpaper.light, opacity: 1 },
    ];
  }

  const hour =
    typeof time === "number"
      ? normalizeHour(time)
      : getDynamicWallpaperHour(time);

  let dark = 0;
  let base = 0;
  let light = 0;

  if (hour < 5 || hour >= 22) {
    dark = 1;
  } else if (hour < 7) {
    const t = blend(5, 7, hour);
    dark = 1 - t;
    base = t;
  } else if (hour < 10) {
    base = 1;
  } else if (hour < 12) {
    const t = blend(10, 12, hour);
    base = 1 - t;
    light = t;
  } else if (hour < 16) {
    light = 1;
  } else if (hour < 18) {
    const t = blend(16, 18, hour);
    light = 1 - t;
    base = t;
  } else if (hour < 20) {
    base = 1;
  } else {
    const t = blend(20, 22, hour);
    base = 1 - t;
    dark = t;
  }

  return [
    { url: wallpaper.dark, opacity: dark },
    { url: wallpaper.base, opacity: base },
    { url: wallpaper.light, opacity: light },
  ];
}
