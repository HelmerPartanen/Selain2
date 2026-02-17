import { memo, useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { House, Gear, BookmarkSimple, ClockCounterClockwise, ListIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'

const springMenu = { type: 'spring' as const, stiffness: 500, damping: 28 }
const springItem = { type: 'spring' as const, stiffness: 450, damping: 26 }

const menuItems = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'bookmarks', label: 'Bookmarks', icon: BookmarkSimple },
  { id: 'history', label: 'History', icon: ClockCounterClockwise },
  { id: 'divider', label: '', icon: null },
  { id: 'settings', label: 'Settings', icon: Gear }
] as const

function AppMenuInner(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ bottom: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = useCallback(() => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setMenuPosition({
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left
      })
    }
    setIsOpen((prev) => !prev)
  }, [isOpen])

  const handleClose = useCallback(() => setIsOpen(false), [])

  const handleMenuItemClick = useCallback(
    (action: string) => {
      if (action === 'settings') {
        useUIStore.getState().toggleSettings()
      } else if (action === 'home') {
        useTabStore.getState().addTab('browser://newtab')
      }
      handleClose()
    },
    [handleClose]
  )

  let itemIndex = 0

  return (
    <div ref={containerRef} className="relative">
      <Button variant="icon" onClick={handleToggle} aria-label="Menu" aria-expanded={isOpen}>
        <ListIcon size={18} weight="bold" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[90]" onMouseDown={handleClose} />

            <motion.div
              className="absolute bottom-full mb-2 left-1/2 z-[100] min-w-[180px] rounded-xl overflow-hidden bg-white shadow-xl border border-gray-100"
              style={{ originX: 0.5, originY: 1, x: '-50%' }}
              initial={{ scale: 0.85, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 8 }}
              transition={springMenu}
            >
              <div className="py-1">
              {menuItems.map((item) => {
                if (item.id === 'divider') {
                  return <div key="divider" className="border-t border-gray-100 my-1" />
                }

                const Icon = item.icon!
                const idx = itemIndex++

                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleMenuItemClick(item.id)}
                    className="w-full flex items-center gap-3 px-3.5 h-9 text-[13px] font-medium text-gray-700 [app-region:no-drag]"
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ ...springItem, delay: 0.02 + idx * 0.04 }}
                    whileHover={{ backgroundColor: '#f3f4f6', color: '#111827' }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Icon size={16} weight="bold" />
                    <span>{item.label}</span>
                  </motion.button>
                )
              })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export const AppMenu = memo(AppMenuInner)