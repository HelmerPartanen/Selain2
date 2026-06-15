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
            <div className={`relative rounded-full overflow-hidden ${disableBlurEffects ? 'bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10' : 'bg-white dark:bg-[#1D1F23] border border-black/5 dark:border-white/5'}`}>
              {/* Trigger button - opens fullscreen AI page */}
              <motion.button
                onClick={handleOpenFullscreen}
                aria-label="AI Summary - Fullscreen"
                whileTap={{ scale: 0.82 }}
                transition={SPRING_SNAPPY}
                className={`h-10 w-10 rounded-full flex items-center justify-center text-gray-700 dark:text-neutral-300 transition-colors duration-100 select-none ${disableBlurEffects ? 'bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]' : 'bg-white/90 dark:bg-[#1D1F23]/90 backdrop-blur-xs border border-black/5 dark:border-white/5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
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