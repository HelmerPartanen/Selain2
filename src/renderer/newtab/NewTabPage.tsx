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
    </div>
  )
}

export const NewTabPage = memo(NewTabPageInner)
