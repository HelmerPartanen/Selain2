import { memo } from 'react'

function OverlaySpacerInner(): React.JSX.Element {
  return (
    <div
      className="flex-shrink-0"
      style={{ width: 138 }}
      aria-hidden="true"
    />
  )
}

export const OverlaySpacer = memo(OverlaySpacerInner)
