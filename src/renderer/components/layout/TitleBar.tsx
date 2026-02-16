import { memo } from 'react'
import { TabStrip } from '@/components/browser/TabStrip'
import { OverlaySpacer } from '@/components/ui/WindowControls'

function TitleBarInner({ visible }: { visible: boolean }): React.JSX.Element {
  return (
    <div
      className={`flex items-center bg-black/20 backdrop-blur-xl [app-region:drag] select-none pl-1 overflow-hidden h-[40px] transition-opacity duration-200 ease-out ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <TabStrip />
      <OverlaySpacer />
    </div>
  )
}

export const TitleBar = memo(TitleBarInner)
