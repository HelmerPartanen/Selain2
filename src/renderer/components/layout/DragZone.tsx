import { memo, useCallback } from 'react'
import { useSpring, SPRINGS } from '@/hooks/useSpring'

interface DragZoneProps {
  visible: boolean
  onEnter: () => void
  onLeave: () => void
}

function DragZoneInner({ visible, onEnter, onLeave }: DragZoneProps): React.JSX.Element {
  const opacity = useSpring(visible ? 1 : 0, visible ? SPRINGS.quick : SPRINGS.stiff)

  const handleDoubleClick = useCallback(() => {
    window.electronAPI.toggleMaximizeWindow()
  }, [])

  return (
    <>
      {/* Permanent thin trigger strip — always above webview, always interactive */}
      <div
        className="fixed top-0 left-0 right-0 h-2 z-[65]"
        onMouseEnter={onEnter}
        style={{ opacity: 0 }}
      />

      {/* Full drag zone — expands when revealed */}
      <div
        className="fixed top-0 left-0 right-0 h-11 z-[60] [app-region:drag]"
        style={{
          opacity,
          pointerEvents: visible ? 'auto' : 'none',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.06), transparent)',
          willChange: 'opacity'
        }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onDoubleClick={handleDoubleClick}
      />
    </>
  )
}

export const DragZone = memo(DragZoneInner)
