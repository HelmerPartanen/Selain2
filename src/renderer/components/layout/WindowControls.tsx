import { memo, useCallback, useEffect, useState } from 'react'
import { MinusIcon, SquareIcon, XIcon, CardsIcon } from '@phosphor-icons/react'

function WindowControlsInner(): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const unsub = window.electronAPI.onMaximizeChange(setIsMaximized)
    return unsub
  }, [])

  const handleMinimize = useCallback(() => window.electronAPI.minimizeWindow(), [])
  const handleToggleMaximize = useCallback(() => window.electronAPI.toggleMaximizeWindow(), [])
  const handleClose = useCallback(() => window.electronAPI.closeWindow(), [])

  return (
    <div
      className={`
        fixed top-2.5 right-3 z-[60] flex items-center gap-1 rounded-full
        bg-white shadow-lg px-1.5 py-1 [app-region:no-drag]
        transition-all duration-200 ease-out
        ${isHovered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.85] -translate-y-1.5'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Invisible hover trigger zone above the buttons */}
      <div className="absolute -top-3 -left-2 -right-2 h-5" />

      <ControlButton onClick={handleMinimize} label="Minimize" color="hover:bg-gray-100">
        <MinusIcon size={12} weight="bold" />
      </ControlButton>

      <ControlButton onClick={handleToggleMaximize} label={isMaximized ? 'Restore' : 'Maximize'} color="hover:bg-gray-100">
        {isMaximized ? <CardsIcon size={12} weight="bold" /> : <SquareIcon size={10} weight="bold" />}
      </ControlButton>

      <ControlButton onClick={handleClose} label="Close" color="hover:bg-red-600 hover:text-white">
        <XIcon size={12} weight="bold" />
      </ControlButton>
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
