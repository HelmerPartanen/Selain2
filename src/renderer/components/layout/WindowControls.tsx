import { memo, useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Minus, Square, X, CornersIn } from '@phosphor-icons/react'

const spring = { type: 'spring' as const, stiffness: 400, damping: 28 }

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
      initial={{ opacity: 0, scale: 0.9, y: -8 }}
      animate={{
        opacity: isHovered ? 1 : 0,
        scale: isHovered ? 1 : 0.92,
        y: isHovered ? 0 : -4
      }}
      transition={spring}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Invisible hover trigger zone above the buttons */}
      <div className="absolute -top-3 -left-2 -right-2 h-5" />

      <ControlButton onClick={handleMinimize} label="Minimize" color="hover:bg-gray-100">
        <Minus size={12} weight="bold" />
      </ControlButton>

      <ControlButton onClick={handleToggleMaximize} label={isMaximized ? 'Restore' : 'Maximize'} color="hover:bg-gray-100">
        {isMaximized ? <CornersIn size={12} weight="bold" /> : <Square size={10} weight="bold" />}
      </ControlButton>

      <ControlButton onClick={handleClose} label="Close" color="hover:bg-red-500 hover:text-white">
        <X size={12} weight="bold" />
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
