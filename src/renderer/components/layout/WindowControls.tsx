import { memo, useCallback, useEffect, useState } from 'react'
import { Minus, Square, X, CopySimple } from '@phosphor-icons/react'
import { useMultiSpring, SPRINGS } from '@/hooks/useSpring'

interface WindowControlsProps {
  visible: boolean
  onEnter: () => void
  onLeave: () => void
}

function WindowControlsInner({ visible, onEnter, onLeave }: WindowControlsProps): React.JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    const unsub = window.electronAPI.onMaximizeChange((max) => setIsMaximized(max))
    return unsub
  }, [])

  const spring = useMultiSpring(
    {
      opacity: visible ? 1 : 0,
      y: visible ? 0 : -8,
      scale: visible ? 1 : 0.9
    },
    visible ? SPRINGS.quick : SPRINGS.stiff
  )

  const handleMinimize = useCallback(() => window.electronAPI.minimizeWindow(), [])
  const handleMaximize = useCallback(() => window.electronAPI.toggleMaximizeWindow(), [])
  const handleClose = useCallback(() => window.electronAPI.closeWindow(), [])

  const mounted = visible || (spring.opacity ?? 0) > 0.01

  if (!mounted) return <></>

  return (
    <div
      className="fixed top-2 right-3 z-[70] flex items-center gap-0.5 rounded-full px-1 py-1 shadow-lg [app-region:no-drag]"
      style={{
        opacity: spring.opacity,
        transform: `translateY(${spring.y}px) scale(${spring.scale})`,
        pointerEvents: visible ? 'auto' : 'none',
        willChange: 'transform, opacity',
        backgroundColor: 'rgba(240, 240, 240, 0.92)',
        border: '1px solid rgba(0,0,0,0.06)'
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <button
        onClick={handleMinimize}
        onMouseEnter={() => setHovered('min')}
        onMouseLeave={() => setHovered(null)}
        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-75"
        style={{
          backgroundColor: hovered === 'min' ? 'rgba(0,0,0,0.08)' : 'transparent',
          color: hovered === 'min' ? '#1a1a1a' : '#666'
        }}
        aria-label="Minimize"
      >
        <Minus size={12} weight="bold" />
      </button>

      <button
        onClick={handleMaximize}
        onMouseEnter={() => setHovered('max')}
        onMouseLeave={() => setHovered(null)}
        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-75"
        style={{
          backgroundColor: hovered === 'max' ? 'rgba(0,0,0,0.08)' : 'transparent',
          color: hovered === 'max' ? '#1a1a1a' : '#666'
        }}
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? <CopySimple size={12} weight="bold" /> : <Square size={11} weight="bold" />}
      </button>

      <button
        onClick={handleClose}
        onMouseEnter={() => setHovered('close')}
        onMouseLeave={() => setHovered(null)}
        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-75"
        style={{
          backgroundColor: hovered === 'close' ? 'rgba(220,38,38,0.9)' : 'transparent',
          color: hovered === 'close' ? '#fff' : '#666'
        }}
        aria-label="Close"
      >
        <X size={12} weight="bold" />
      </button>
    </div>
  )
}

export const WindowControls = memo(WindowControlsInner)
