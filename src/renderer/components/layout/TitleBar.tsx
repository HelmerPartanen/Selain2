import { memo } from 'react'
import { TabStrip } from '@/components/browser/TabStrip'
import { OverlaySpacer } from '@/components/ui/WindowControls'

function TitleBarInner({ visible }: { visible: boolean }): React.JSX.Element {
  return (
    <div
      className={`flex items-center bg-neutral-950 [app-region:drag] select-none pl-1 overflow-hidden transition-[height] duration-200 ease-out ${
        visible ? 'h-[40px]' : 'h-0'
      }`}
    >
      <TabStrip />
      <OverlaySpacer />
    </div>
  )
}

export const TitleBar = memo(TitleBarInner)
