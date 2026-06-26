// ─── About Pane ─────────────────────────────────────────────────────────────

import { memo } from 'react'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'

function AboutPaneInner(): React.JSX.Element {
  const ua = navigator.userAgent
  const chromeMatch = ua.match(/Chrome\/([\d.]+)/)
  const electronMatch = ua.match(/Electron\/([\d.]+)/)
  const chromeVersion = chromeMatch?.[1] ?? 'Unknown'
  const electronVersion = electronMatch?.[1] ?? 'Unknown'

  return (
    <div className="flex flex-col items-center justify-center h-full py-6 text-center">
      <Text as="h3" tone="primary" className="mb-0.5 text-[18px] font-medium tracking-tight">Browser</Text>
      <Text size="body" tone="muted" className="mb-8">Version {__APP_VERSION__}</Text>
      <Card className="inline-flex min-w-[200px] flex-col gap-2">
        <div className="flex items-center justify-between text-[12px]">
          <Text as="span" size="caption" tone="muted">Chromium</Text>
          <Text as="span" size="caption" tone="secondary" className="tabular-nums">{chromeVersion}</Text>
        </div>
        <div className="h-px bg-[var(--app-separator)]" />
        <div className="flex items-center justify-between text-[12px]">
          <Text as="span" size="caption" tone="muted">Electron</Text>
          <Text as="span" size="caption" tone="secondary" className="tabular-nums">42.3.3</Text>
        </div>
        <div className="h-px bg-[var(--app-separator)]" />
        <div className="flex items-center justify-between text-[12px]">
          <Text as="span" size="caption" tone="muted">DRM</Text>
          <Text as="span" size="caption" tone="secondary">Widevine</Text>
        </div>
      </Card>
    </div>
  )
}

export const AboutPane = memo(AboutPaneInner);
