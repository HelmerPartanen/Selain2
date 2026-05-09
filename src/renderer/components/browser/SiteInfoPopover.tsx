import { memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import lockFillSvg from '@/assets/icons/Objects/Lock_Fill.svg?raw'
import globeSvg from '@/assets/icons/Nature/Globe.svg?raw'
import { SPRING_POPUP } from '@/utils/springs'

interface SiteInfoPopoverProps {
  isOpen: boolean
  onClose: () => void
  url: string
  isSecure: boolean
}

export const SiteInfoPopover = memo(function SiteInfoPopover({ isOpen, onClose, url, isSecure }: SiteInfoPopoverProps) {
  if (!isOpen) return null

  let hostname = ''
  try {
    hostname = new URL(url).hostname
  } catch {
    // ignore
  }

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <motion.div
        className="absolute top-full mt-2 left-0 w-72 p-4 rounded-2xl glass z-[100] shadow-xl border border-white/10 dark:border-white/5"
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={SPRING_POPUP}
        style={{ originY: 0, originX: 0 }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isSecure ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'}`}>
            <SvgIcon svg={isSecure ? lockFillSvg : globeSvg} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{hostname || 'Unknown Site'}</h3>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
              {isSecure ? 'Connection is secure' : 'Your connection to this site is not secure'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            {isSecure
              ? 'Your connection is encrypted. Information you send is private.'
              : 'Your connection is not private. Avoid entering sensitive information on this site.'}
          </p>
        </div>
      </motion.div>
    </>
  )
})
