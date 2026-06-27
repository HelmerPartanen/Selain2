import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { m } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import { SvgIcon } from '@/components/ui/SvgIcon'
import summarySvg from '@/assets/icons/Interface/Summary2.svg?raw'
import bookTextSvg from '@/assets/icons/Objects/Book_Text.svg?raw'
import bookMenuSvg from '@/assets/icons/Interface/ToolMenu.svg?raw'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { SPRING_SNAPPY } from '@/utils/springs'

const AUTOHIDE_DELAY = 650
const CLOSE_MS = 220

function ReadingToolsButtonInner(): React.JSX.Element {
  const { openAIFullscreen, openReaderMode } = useUIStore(
    useShallow((s) => ({
      openAIFullscreen: s.openAIFullscreen,
      openReaderMode: s.openReaderMode,
    })),
  )

  const disableAnimations = useSettingsStore((s) => s.disableAnimations)

  const [hovered, setHovered] = useState(false)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [tilt, setTilt] = useState(false)

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const transition = disableAnimations ? { duration: 0 } : SPRING_SNAPPY

  const isOpen = open
  const isClosing = closing
  const isOpening = open && !closing
  const expanded = hovered || open || closing

  const surfaceClass = 'bg-[var(--app-bg-primary)] border border-[var(--app-separator)] text-[var(--app-text-primary)]'

  const toolButtonClass =
    'h-[42px] w-[42px] rounded-xl flex items-center justify-center transition-colors duration-100 select-none hover:bg-[var(--app-control-hover)] shrink-0'

  // -------------------------
  // HOVER
  // -------------------------
  const handleEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setHovered(true)
  }

  const handleLeave = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)

    hideTimer.current = setTimeout(() => {
      setHovered(false)
    }, AUTOHIDE_DELAY)
  }

  // -------------------------
  // TOGGLE
  // -------------------------
  const closeTools = useCallback(() => {
    if (!open) return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setClosing(true)
    setOpen(false)
    closeTimer.current = setTimeout(() => {
      setClosing(false)
      closeTimer.current = null
    }, CLOSE_MS)
  }, [open])

  const handleToggle = () => {
    if (open) {
      closeTools()
    } else {
      setOpen(true)
    }
  }

  const triggerTilt = () => {
    setTilt(true)
    setTimeout(() => setTilt(false), 200)
  }

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeTools()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [closeTools, open])

  // -------------------------
  // POSITIONING
  // -------------------------
  const getOffset = (index: number) => {
    const spacing = 52
    return {
      x: expanded ? -(index + 1) * spacing : 0,
      y: 0,
    }
  }

  // -------------------------
  // STAGGER LOGIC (KEY FIX)
  // -------------------------
  const getDelay = (index: number) => {
    if (disableAnimations) return 0

    // OPEN: AI first, Reader second
    if (isOpening) return index * 0.05

    // CLOSE: Reader first, AI second (REVERSED)
    if (isClosing) return (1 - index) * 0.05

    return 0
  }

  return (
    <div className="fixed inset-0 z-[95] pointer-events-none">
      {open && (
        <div
          className="fixed inset-0 z-0 pointer-events-auto [app-region:no-drag]"
          onMouseDown={closeTools}
        />
      )}

      <div className="absolute inset-0 flex items-end justify-end p-2 pointer-events-none">
        {/* HOT ZONE */}
        <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-auto" onMouseEnter={handleEnter} onMouseLeave={handleLeave} />

        {/* STACK */}
        <m.div
          className="relative flex items-center pointer-events-auto"
          animate={{
            opacity: expanded ? 1 : 0,
            y: expanded ? 0 : 20,
            scale: expanded ? 1 : 0.95,
          }}
          transition={transition}
        >
          {/* TOOLBOX */}
          <m.button
            aria-label="Toolbox"
            onClick={() => {
              handleToggle()
              triggerTilt()
            }}
            className={`${toolButtonClass} ${surfaceClass} relative z-30`}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
            animate={{
              rotate: open ? -18 : tilt ? -18 : 0,
              scale: expanded ? 1 : 0.9,
            }}
            transition={transition}
          >
            <m.div animate={open || tilt ? { rotate: -25 } : { rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
              <div style={{ display: 'flex' }}>
                <SvgIcon svg={bookMenuSvg} size={18} className="text-violet-500 dark:text-violet-400" />
              </div>
            </m.div>
          </m.button>

          {/* AI SUMMARY (INDEX 0) */}
          <m.button
            onClick={() => {
              openAIFullscreen()
              handleToggle()
            }}
            aria-label="Open AI summary"
            aria-hidden={!isOpen}
            tabIndex={isOpen ? 0 : -1}
            className={`${toolButtonClass} ${surfaceClass} absolute`}
            animate={{
              ...getOffset(0),
              opacity: isOpen ? 1 : 0,
              scale: isOpen ? 1 : 0.7,
            }}
            transition={{
              ...transition,
              delay: getDelay(0),
            }}
            style={{ zIndex: 20 }}
            whileTap={{ scale: 0.85 }}
          >
            <SvgIcon svg={summarySvg} size={18} className="text-blue-400" />
          </m.button>

          {/* READER MODE (INDEX 1) */}
          <m.button
            onClick={() => {
              openReaderMode()
              handleToggle()
            }}
            aria-label="Open reader mode"
            aria-hidden={!isOpen}
            tabIndex={isOpen ? 0 : -1}
            className={`${toolButtonClass} ${surfaceClass} absolute`}
            animate={{
              ...getOffset(1),
              opacity: isOpen ? 1 : 0,
              scale: isOpen ? 1 : 0.7,
            }}
            transition={{
              ...transition,
              delay: getDelay(1),
            }}
            style={{ zIndex: 10 }}
            whileTap={{ scale: 0.85 }}
          >
            <SvgIcon svg={bookTextSvg} size={18} className="text-emerald-500" />
          </m.button>
        </m.div>
      </div>
    </div>
  )
}

export const AISummaryButton = memo(ReadingToolsButtonInner)
