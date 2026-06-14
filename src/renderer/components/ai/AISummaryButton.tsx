import { memo, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import sparkleSvg from '@/assets/icons/Weather/Sparkle.svg?raw'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { SPRING_SNAPPY } from '@/utils/springs'
import { useAIStore } from '@/store/aiStore'

// ── Main component ──────────────────────────────────────────────────────────

function AISummaryButtonInner(): React.JSX.Element {
  const isOpen = useUIStore((s) => s.isAISummaryOpen)
  const toggleAISummary = useUIStore((s) => s.toggleAISummary)
  const closeAISummary = useUIStore((s) => s.closeAISummary)
  const openAIFullscreen = useUIStore((s) => s.openAIFullscreen)
  const aiStatus = useAIStore((s) => s.status)
  const checkAIStatus = useAIStore((s) => s.checkStatus)
  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects)
  const isAIReady = aiStatus === 'ready'
  const [isHovered, setIsHovered] = useState(false)

  // Open fullscreen instead of panel
  const handleOpenFullscreen = useCallback(() => {
    openAIFullscreen()
  }, [openAIFullscreen])

  // Check AI status on component mount
  useEffect(() => {
    if (aiStatus === 'idle') {
      checkAIStatus()
    }
  }, [aiStatus, checkAIStatus])

  return (
    <>
      {/* Bottom-right hover trigger zone */}
      <div
        className="fixed bottom-0 right-0 w-20 h-20 z-[95] [app-region:no-drag]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Floating AI button */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="fixed bottom-5 right-5 z-[95] [app-region:no-drag]"
            initial={{ scale: 0.5, opacity: 0, filter: 'blur(6px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 0.5, opacity: 0, filter: 'blur(6px)' }}
            transition={SPRING_SNAPPY}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="relative">
              {/* Trigger button - opens fullscreen AI page */}
              <motion.button
                onClick={handleOpenFullscreen}
                aria-label="AI Summary - Fullscreen"
                whileTap={{ scale: 0.82 }}
                transition={SPRING_SNAPPY}
                className="h-10 w-10 rounded-full flex items-center justify-center text-gray-700 dark:text-neutral-300 bg-black/90 backdrop-blur-sm hover:bg-black/[0.04] dark:hover:bg-black/70 border border-white/10 transition-colors duration-100 select-none"
              >
                <SvgIcon svg={sparkleSvg} size={18} className="text-blue-400 dark:text-blue-400" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export const AISummaryButton = memo(AISummaryButtonInner)