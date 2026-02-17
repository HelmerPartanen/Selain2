import { memo, useCallback } from 'react'
import { motion } from 'motion/react'
import { Gear } from '@phosphor-icons/react'
import { useUIStore } from '@/store/uiStore'

function NewTabPageInner(): React.JSX.Element {
  const handleOpenSettings = useCallback(() => {
    useUIStore.getState().toggleSettings()
  }, [])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
      <motion.button
        onClick={handleOpenSettings}
        className="absolute bottom-20 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 shadow-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
        initial={{ opacity: 0, y: 10, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22, mass: 0.7 }}
      >
        <Gear size={16} weight="regular" />
        Customize
      </motion.button>
    </div>
  )
}

export const NewTabPage = memo(NewTabPageInner)
