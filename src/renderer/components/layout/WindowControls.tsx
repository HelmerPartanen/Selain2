import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { SvgIcon, SQUARE_SVG, CARDS_SVG } from '@/components/ui/SvgIcon'
import minusSvg from '@/assets/icons/Maths/Minus.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'

const HIDE_DELAY = 800

function WindowControlsInner(): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const hideTimerRef = useRef<number>(0)

  useEffect(() => {
    const unsub = window.electronAPI.onMaximizeChange(setIsMaximized)
    return unsub
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = 0
    }
    setIsVisible(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false)
      hideTimerRef.current = 0
    }, HIDE_DELAY)
  }, [])

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current)
    }
  }, [])

  const handleMinimize = useCallback(() => window.electronAPI.minimizeWindow(), [])
  const handleToggleMaximize = useCallback(() => window.electronAPI.toggleMaximizeWindow(), [])
  const handleClose = useCallback(() => window.electronAPI.closeWindow(), [])

  return (
    <div
      className="fixed top-0 right-0 z-[60] [app-region:no-drag]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ pointerEvents: 'none' }}
    >
      {/* Trigger zone — top-right corner target for discoverability */}
      <div className="absolute top-0 right-0 w-20 h-5" style={{ pointerEvents: 'auto' }} />

      {/* Subtle hint dots visible when controls are hidden */}
      {!isVisible && (
        <div className="absolute top-2.5 right-5 flex gap-1.5 opacity-30 hover:opacity-60 transition-opacity duration-300" style={{ pointerEvents: 'auto' }}>
          <div className="w-[5px] h-[5px] rounded-full bg-gray-400 dark:bg-neutral-500" />
          <div className="w-[5px] h-[5px] rounded-full bg-gray-400 dark:bg-neutral-500" />
          <div className="w-[5px] h-[5px] rounded-full bg-gray-400 dark:bg-neutral-500" />
        </div>
      )}

      <div
        className={`
          mt-2.5 mr-3 flex items-center gap-1 rounded-full
          bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg px-1.5 py-1
          transition-all duration-200 ease-out
          ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.85] -translate-y-1.5'}
        `}
        style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      >

      <ControlButton onClick={handleMinimize} label="Minimize" color="hover:bg-gray-100 dark:hover:bg-neutral-800">
        <SvgIcon svg={minusSvg} size={12} />
      </ControlButton>

      <ControlButton onClick={handleToggleMaximize} label={isMaximized ? 'Restore' : 'Maximize'} color="hover:bg-gray-100 dark:hover:bg-neutral-800">
        {isMaximized ? <SvgIcon svg={CARDS_SVG} size={12} /> : <SvgIcon svg={SQUARE_SVG} size={10} />}
      </ControlButton>

      <ControlButton onClick={handleClose} label="Close" color="hover:bg-red-200 hover:text-red-500 dark:hover:bg-red-900/50 dark:hover:text-red-400">
        <SvgIcon svg={closeSvg} size={12} />
      </ControlButton>
      </div>
    </div>
  )
}

function ControlButton({
  onClick,
  label,
  color,
  children
}: {
  onClick: () => void
  label: string
  color: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`w-7 h-7 rounded-full flex items-center justify-center text-gray-600 dark:text-neutral-400 transition-all duration-75 active:scale-85 ${color}`}
    >
      {children}
    </button>
  )
}

export const WindowControls = memo(WindowControlsInner)
