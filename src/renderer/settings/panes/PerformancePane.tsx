import { memo } from 'react'
import { GroupBox } from '@/components/ui/GroupBox'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { SettingGroup, SettingRow, Toggle } from '@/settings/components/SettingsShared'
import { useSettingsStore } from '@/store/settingsStore'

function PerformancePaneInner(): React.JSX.Element {
  const lowPowerMode = useSettingsStore((s) => s.lowPowerMode)
  const setLowPowerMode = useSettingsStore((s) => s.setLowPowerMode)
  const autoSleepTabs = useSettingsStore((s) => s.autoSleepTabs)
  const setAutoSleepTabs = useSettingsStore((s) => s.setAutoSleepTabs)
  const maxAliveTabs = useSettingsStore((s) => s.maxAliveTabs)
  const setMaxAliveTabs = useSettingsStore((s) => s.setMaxAliveTabs)
  const showPerformanceBadges = useSettingsStore((s) => s.showPerformanceBadges)
  const setShowPerformanceBadges = useSettingsStore((s) => s.setShowPerformanceBadges)

  return (
    <div className="space-y-7">
      <GroupBox title="Performance" desc="Keep browsing responsive when many tabs are open.">
        <SettingGroup>
          <SettingRow label="Low power mode" desc="Sleep background tabs sooner and keep fewer tabs active.">
            <Toggle checked={lowPowerMode} onChange={setLowPowerMode} label="Low power mode" />
          </SettingRow>
          <SettingRow label="Auto-sleep tabs" desc="Automatically pause cold background tabs.">
            <Toggle checked={autoSleepTabs} onChange={setAutoSleepTabs} label="Auto-sleep tabs" />
          </SettingRow>
          <SettingRow label="Keep active tabs alive" desc="Number of recent tabs kept ready before older tabs sleep.">
            <div className="flex items-center gap-2">
              <Button variant="subtle" size="xs" onClick={() => setMaxAliveTabs(maxAliveTabs - 1)} disabled={maxAliveTabs <= 3}>-</Button>
              <Text size="caption" tone="primary" className="w-8 text-center tabular-nums">{maxAliveTabs}</Text>
              <Button variant="subtle" size="xs" onClick={() => setMaxAliveTabs(maxAliveTabs + 1)} disabled={maxAliveTabs >= 30}>+</Button>
            </div>
          </SettingRow>
          <SettingRow label="Performance badges" desc="Show sleeping and resource status in tab tools.">
            <Toggle checked={showPerformanceBadges} onChange={setShowPerformanceBadges} label="Performance badges" />
          </SettingRow>
        </SettingGroup>
      </GroupBox>
    </div>
  )
}

export const PerformancePane = memo(PerformancePaneInner)
