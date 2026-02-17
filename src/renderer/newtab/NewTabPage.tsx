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
        className="absolute bottom-20 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-full glass-surface text-sm"
        style={{ color: 'var(--text-secondary)' }}
        whileHover={{ scale: 1.04, backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-primary)' }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      >
        <Gear size={16} weight="regular" />
        Customize
      </motion.button>
    </div>
  )
}

export const NewTabPage = memo(NewTabPageInner)
