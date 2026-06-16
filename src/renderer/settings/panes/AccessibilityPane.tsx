import { memo } from "react";
import { Toggle, SettingGroup, SectionHeader } from "@/settings/components/SettingsShared";
import { useSettingsStore } from "@/store/settingsStore";

function AccessibilityPaneInner(): React.JSX.Element {
  const disableAnimations = useSettingsStore((s) => s.disableAnimations);
  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects);
  const setDisableAnimations = useSettingsStore((s) => s.setDisableAnimations);
  const setDisableBlurEffects = useSettingsStore((s) => s.setDisableBlurEffects);

  return (
    <div className="space-y-7">
      <div>
        <SectionHeader className="mb-3">Visibility</SectionHeader> 
        <SettingGroup className="bg-white dark:bg-white/8 rounded-xl overflow-hidden">

          {/* Row 1 */}
          <div className="flex items-center justify-between gap-4 py-3 px-3.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-150">
            <div className="min-w-0">
              <div className="text-[13px] font-normal text-gray-700 dark:text-neutral-200">
                Reduce motion
              </div>
              <div className="text-[11px] text-gray-400 dark:text-neutral-500 mt-0.5 leading-relaxed">
                Disable UI transitions and animations.
              </div>
            </div>
            <div className="flex-shrink-0">
              <Toggle
                checked={disableAnimations}
                onChange={setDisableAnimations}
                label="Reduce motion"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-black/[0.08] dark:bg-white/[0.10]" />

          {/* Row 2 */}
          <div className="flex items-center justify-between gap-4 py-3 px-3.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-150">
            <div className="min-w-0">
              <div className="text-[13px] font-normal text-gray-700 dark:text-neutral-200">
                Disable blur and translucency
              </div>
              <div className="text-[11px] text-gray-400 dark:text-neutral-500 mt-0.5 leading-relaxed">
                Turn off backdrop blur and transparency.
              </div>
            </div>
            <div className="flex-shrink-0">
              <Toggle
                checked={disableBlurEffects}
                onChange={setDisableBlurEffects}
                label="Disable blur effects"
              />
            </div>
          </div>
        </SettingGroup>
      </div>
    </div>
  );
}

export const AccessibilityPane = memo(AccessibilityPaneInner);