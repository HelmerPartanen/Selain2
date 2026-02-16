import { memo } from 'react'
import { TabStrip } from '@/components/browser/TabStrip'
import { OverlaySpacer } from '@/components/ui/WindowControls'

function TitleBarInner(): React.JSX.Element {
  return (
    <div
      className="flex items-center h-[40px] bg-surface-dim [app-region:drag] select-none pl-1"
    >
      <TabStrip />
      <OverlaySpacer />
    </div>
  )
}

export const TitleBar = memo(TitleBarInner)
