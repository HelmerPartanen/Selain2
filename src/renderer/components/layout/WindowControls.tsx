import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { MinusIcon, SquareIcon, XIcon, CardsIcon } from '@phosphor-icons/react'

const spring = { type: 'spring' as const, stiffness: 380, damping: 24, mass: 0.7 }

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
    <motion.div
      className="fixed top-2.5 right-3 z-[60] flex items-center gap-1 rounded-full bg-white shadow-lg px-1.5 py-1 [app-region:no-drag]"
      initial={{ opacity: 0, scale: 0.8, y: -10 }}
      animate={{
        opacity: isHovered ? 1 : 0,
        scale: isHovered ? 1 : 0.85,
        y: isHovered ? 0 : -6
      }}
      transition={spring}
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
    </motion.div>
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
    <motion.button
      onClick={onClick}
      aria-label={label}
      className={`w-7 h-7 rounded-full flex items-center justify-center text-gray-600 transition-colors duration-75 ${color}`}
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
    >
      {children}
    </motion.button>
  )
}

export const WindowControls = memo(WindowControlsInner)
