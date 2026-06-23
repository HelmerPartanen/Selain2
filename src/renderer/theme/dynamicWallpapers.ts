import baseUrl from "@/assets/wallpapers/dynamic/Wallpaper_Base.png";
import darkUrl from "@/assets/wallpapers/dynamic/Wallpaper_Dark.png";
import lightUrl from "@/assets/wallpapers/dynamic/Wallpaper_Light.png";

export const DYNAMIC_WALLPAPER_KEY = "dynamic:day-cycle";

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

export function getDynamicWallpaperLayers(date = new Date()): DynamicWallpaperLayer[] {
  const urls = resolveDynamicWallpaperUrls();
  const hour =
    date.getHours() +
    date.getMinutes() / 60 +
    date.getSeconds() / 3600;

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
