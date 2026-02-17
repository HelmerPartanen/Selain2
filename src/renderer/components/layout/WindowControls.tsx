import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { MinusIcon, SquareIcon, XIcon, CardsIcon } from '@phosphor-icons/react'

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
      {/* Invisible trigger zone — only the very top-right corner activates the controls */}
      <div className="absolute top-0 right-0 w-5 h-5" style={{ pointerEvents: 'auto' }} />

      <div
        className={`
          mt-2.5 mr-3 flex items-center gap-1 rounded-full
          bg-white shadow-lg px-1.5 py-1
          transition-all duration-200 ease-out
          ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.85] -translate-y-1.5'}
        `}
        style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      >

      <ControlButton onClick={handleMinimize} label="Minimize" color="hover:bg-gray-100">
        <MinusIcon size={12} weight="bold" />
      </ControlButton>

      <ControlButton onClick={handleToggleMaximize} label={isMaximized ? 'Restore' : 'Maximize'} color="hover:bg-gray-100">
        {isMaximized ? <CardsIcon size={12} weight="bold" /> : <SquareIcon size={10} weight="bold" />}
      </ControlButton>

      <ControlButton onClick={handleClose} label="Close" color="hover:bg-red-200 hover:text-red-500">
        <XIcon size={12} weight="bold" />
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
      className={`w-7 h-7 rounded-full flex items-center justify-center text-gray-600 transition-all duration-75 active:scale-85 ${color}`}
    >
      {children}
    </button>
  )
}

export const WindowControls = memo(WindowControlsInner)
