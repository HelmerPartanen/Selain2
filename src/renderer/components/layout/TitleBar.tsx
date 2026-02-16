import { memo } from 'react'
import { TabStrip } from '@/components/browser/TabStrip'
import { OverlaySpacer } from '@/components/ui/WindowControls'

function TitleBarInner(): React.JSX.Element {
  return (
    <div
      className="flex items-center h-10 bg-surface-dim/80 border-b border-border [app-region:drag] select-none"
    >
      <div className="flex items-center pl-3 pr-1 flex-shrink-0 [app-region:no-drag]">
        <span className="text-xs font-semibold tracking-wide text-text-dim">Aether</span>
      </div>
      <TabStrip />
      <OverlaySpacer />
    </div>
  )
}

export const TitleBar = memo(TitleBarInner)
