import { memo, useCallback } from 'react'
import { Minus, Square, X } from '@phosphor-icons/react'

function WindowControlsInner(): React.JSX.Element {
  const handleMinimize = useCallback(() => window.electronAPI.minimizeWindow(), [])
  const handleMaximize = useCallback(() => window.electronAPI.toggleMaximizeWindow(), [])
  const handleClose = useCallback(() => window.electronAPI.closeWindow(), [])

  return (
    <div className="flex items-center flex-shrink-0 [app-region:no-drag]">
      <button
        onClick={handleMinimize}
        className="w-[46px] h-[34px] flex items-center justify-center transition-colors duration-75"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        aria-label="Minimize"
      >
        <Minus size={14} weight="bold" />
      </button>
      <button
        onClick={handleMaximize}
        className="w-[46px] h-[34px] flex items-center justify-center transition-colors duration-75"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        aria-label="Maximize"
      >
        <Square size={12} weight="bold" />
      </button>
      <button
        onClick={handleClose}
        className="w-[46px] h-[34px] flex items-center justify-center transition-colors duration-75"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#e81123'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        aria-label="Close"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  )
}

export const WindowControls = memo(WindowControlsInner)

/** @deprecated Use WindowControls instead — kept for any remaining references */
export const OverlaySpacer = memo(function OverlaySpacerInner(): React.JSX.Element {
  return <WindowControls />
})
