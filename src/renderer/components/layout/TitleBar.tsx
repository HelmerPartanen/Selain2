import { memo } from 'react'
import { AppMenu } from './AppMenu'
import { TabStrip } from '@/components/browser/TabStrip'
import { OverlaySpacer } from '@/components/ui/WindowControls'

function TitleBarInner(): React.JSX.Element {
  return (
    <div
      className="flex items-center h-11 bg-surface-dim [app-region:drag] select-none"
    >
      <AppMenu />
      <TabStrip />
      <OverlaySpacer />
    </div>
  )
}

export const TitleBar = memo(TitleBarInner)
