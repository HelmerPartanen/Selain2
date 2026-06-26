import { memo, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
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

  const transition = disableAnimations ? { duration: 0 } : SPRING_SNAPPY

  const isOpen = open
  const isClosing = closing
  const isOpening = open && !closing
  const expanded = hovered || open || closing

  const surfaceClass = 'bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)] text-[var(--app-text-primary)]'

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
  const handleToggle = () => {
    if (open) {
      setClosing(true)
      setOpen(false)

      setTimeout(() => setClosing(false), CLOSE_MS)
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
    }
  }, [])

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
      <div className="absolute inset-0 flex items-end justify-end p-2 pointer-events-none">
        {/* HOT ZONE */}
        <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-auto" onMouseEnter={handleEnter} onMouseLeave={handleLeave} />

        {/* STACK */}
        <motion.div
          className="relative flex items-center pointer-events-auto"
          animate={{
            opacity: expanded ? 1 : 0,
            y: expanded ? 0 : 20,
            scale: expanded ? 1 : 0.95,
          }}
          transition={transition}
        >
          {/* TOOLBOX */}
          <motion.button
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
            <motion.div animate={open || tilt ? { rotate: -25 } : { rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
              <div style={{ display: 'flex' }}>
                <SvgIcon svg={bookMenuSvg} size={18} className="text-violet-500 dark:text-violet-400" />
              </div>
            </motion.div>
          </motion.button>

          {/* AI SUMMARY (INDEX 0) */}
          <motion.button
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
          </motion.button>

          {/* READER MODE (INDEX 1) */}
          <motion.button
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
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

export const AISummaryButton = memo(ReadingToolsButtonInner)
