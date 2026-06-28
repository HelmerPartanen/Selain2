// ─── About Pane ─────────────────────────────────────────────────────────────

import { memo } from 'react'
import { Text } from '@/components/ui/Text'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { SettingGroup, SettingRow } from '@/settings/components/SettingsShared'
import { GroupBox } from "@/components/ui/GroupBox";
import dottSvg from '@/assets/icons/Interface/Dott.svg?raw'

function AboutPaneInner(): React.JSX.Element {
  const ua = navigator.userAgent
  const chromeMatch = ua.match(/Chrome\/([\d.]+)/)
  const electronMatch = ua.match(/Electron\/([\d.]+)/)
  const chromeVersion = chromeMatch?.[1] ?? 'Unknown'
  const electronVersion = electronMatch?.[1] ?? 'Unknown'

  return (
    <div className="flex flex-col items-center justify-center h-full py-6 text-center">
      <div className="flex flex-col mb-3 items-center justify-center rounded-xl p-1 bg-[var(--app-text-primary)]">
      <SvgIcon svg={dottSvg} size={44} className="text-[var(--app-bg-primary)]" />
      </div>
      <Text as="h3" tone="primary" className="text-[24px] font-medium tracking-loose">Dott</Text>
      <Text size="body" tone="muted" className="mb-8">Version {__APP_VERSION__}</Text>
      <GroupBox className="min-w-[260px] text-left">
        <SettingGroup>
          <SettingRow label="Chromium">
            <Text as="span" size="caption" tone="secondary" className="tabular-nums">{chromeVersion}</Text>
          </SettingRow>
          <SettingRow label="Electron">
            <Text as="span" size="caption" tone="secondary" className="tabular-nums">{electronVersion}</Text>
          </SettingRow>
        </SettingGroup>
      </GroupBox>
    </div>
  )
}

export const AboutPane = memo(AboutPaneInner);
