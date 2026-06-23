import baseUrl from "@/assets/wallpapers/dynamic/Wallpaper_Base.png";
import darkUrl from "@/assets/wallpapers/dynamic/Wallpaper_Dark.png";
import lightUrl from "@/assets/wallpapers/dynamic/Wallpaper_Light.png";

export const DYNAMIC_WALLPAPER_KEY = "dynamic:day-cycle";
const DEV_TIME_OVERRIDE_STORAGE_KEY = "dynamic-wallpaper-dev-hour";
const DEV_TIME_OVERRIDE_EVENT = "dynamic-wallpaper-dev-hour-change";
const MODE_STORAGE_KEY = "dynamic-wallpaper-mode";
const MODE_EVENT = "dynamic-wallpaper-mode-change";

export type DynamicWallpaperMode = "dynamic" | "light" | "dark";

export interface DynamicWallpaperLayer {
  url: string;
  opacity: number;
}

export function isDynamicWallpaperKey(value: string): boolean {
  return value === DYNAMIC_WALLPAPER_KEY;
}

export function resolveDynamicWallpaperUrls(): {
  base: string;
  dark: string;
  light: string;
} {
  return {
    base: baseUrl,
    dark: darkUrl,
    light: lightUrl,
  };
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
  return (
    date.getHours() +
    date.getMinutes() / 60 +
    date.getSeconds() / 3600
  );
}

export function formatDynamicWallpaperHour(hour: number): string {
  const normalized = normalizeHour(hour);
  const totalMinutes = Math.round(normalized * 60) % 1440;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function getDynamicWallpaperDevHourOverride(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DEV_TIME_OVERRIDE_STORAGE_KEY);
  if (raw === null) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return normalizeHour(parsed);
}

export function setDynamicWallpaperDevHourOverride(hour: number | null): void {
  if (typeof window === "undefined") return;
  if (hour === null) {
    window.localStorage.removeItem(DEV_TIME_OVERRIDE_STORAGE_KEY);
  } else {
    window.localStorage.setItem(DEV_TIME_OVERRIDE_STORAGE_KEY, String(normalizeHour(hour)));
  }
  window.dispatchEvent(new Event(DEV_TIME_OVERRIDE_EVENT));
}

export function subscribeDynamicWallpaperDevHourOverride(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent): void => {
    if (event.key === DEV_TIME_OVERRIDE_STORAGE_KEY) callback();
  };
  window.addEventListener(DEV_TIME_OVERRIDE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(DEV_TIME_OVERRIDE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function getDynamicWallpaperMode(): DynamicWallpaperMode {
  if (typeof window === "undefined") return "dynamic";
  const raw = window.localStorage.getItem(MODE_STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "dynamic" ? raw : "dynamic";
}

export function setDynamicWallpaperMode(mode: DynamicWallpaperMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  window.dispatchEvent(new Event(MODE_EVENT));
}

export function subscribeDynamicWallpaperMode(callback: () => void): () => void {
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
  time: Date | number = new Date(),
  mode: DynamicWallpaperMode = "dynamic",
): DynamicWallpaperLayer[] {
  const urls = resolveDynamicWallpaperUrls();
  if (mode === "dark") {
    return [
      { url: urls.dark, opacity: 1 },
      { url: urls.base, opacity: 0 },
      { url: urls.light, opacity: 0 },
    ];
  }
  if (mode === "light") {
    return [
      { url: urls.dark, opacity: 0 },
      { url: urls.base, opacity: 0 },
      { url: urls.light, opacity: 1 },
    ];
  }

  const hour = typeof time === "number" ? normalizeHour(time) : getDynamicWallpaperHour(time);

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
    { url: urls.dark, opacity: dark },
    { url: urls.base, opacity: base },
    { url: urls.light, opacity: light },
  ];
}
