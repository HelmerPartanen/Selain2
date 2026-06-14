import { memo } from "react";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { Desc, SectionHeader, Toggle, SettingRow, SettingGroup } from "@/settings/components/SettingsShared";
import { useSettingsStore } from "@/store/settingsStore";
import monitorSvg from "@/assets/icons/Devices/Display.svg?raw";
import sparklesSvg from "@/assets/icons/Interface/Star.svg?raw";

function GraphicsPaneInner(): React.JSX.Element {
  const disableAnimations = useSettingsStore((s) => s.disableAnimations);
  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects);
  const setDisableAnimations = useSettingsStore((s) => s.setDisableAnimations);
  const setDisableBlurEffects = useSettingsStore((s) => s.setDisableBlurEffects);

  return (
    <div className="space-y-7">
      <div>
        <SectionHeader>Graphics Performance</SectionHeader>
        <Desc>Reduce visual effects to improve responsiveness on low-end hardware.</Desc>
        <SettingGroup className="bg-white/80 dark:bg-[#1B1D21]/80 border border-black/5 dark:border-white/5">
          <SettingRow
            label="Reduce motion"
            desc="Disable non-essential UI transitions and animated menus."
          >
            <Toggle
              checked={disableAnimations}
              onChange={setDisableAnimations}
              label="Reduce motion"
            />
          </SettingRow>
          <SettingRow
            label="Disable blur and translucency"
            desc="Turn off backdrop blur and glassy transparency for faster rendering."
          >
            <Toggle
              checked={disableBlurEffects}
              onChange={setDisableBlurEffects}
              label="Disable blur effects"
            />
          </SettingRow>
        </SettingGroup>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-white/90 dark:bg-[#1D1F23]/90 p-4">
          <div className="flex items-center gap-3 mb-3">
            <SvgIcon svg={monitorSvg} size={20} />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Low-End Friendly</p>
              <p className="text-[11px] text-gray-500 dark:text-neutral-400">Fewer composited layers and cheaper effects.</p>
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-gray-600 dark:text-neutral-300">
            Use these controls when animations or blur cause stuttering, screen tearing, or high GPU usage.
          </p>
        </div>

        <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-white/90 dark:bg-[#1D1F23]/90 p-4">
          <div className="flex items-center gap-3 mb-3">
            <SvgIcon svg={sparklesSvg} size={20} />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Instant UI</p>
              <p className="text-[11px] text-gray-500 dark:text-neutral-400">Animated transitions are replaced with instant state changes.</p>
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-gray-600 dark:text-neutral-300">
            This setting preserves the browser structure while reducing visual noise and GPU pressure.
          </p>
        </div>
      </div>
    </div>
  );
}

export const GraphicsPane = memo(GraphicsPaneInner);
