import { memo, useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { House, Gear, BookmarkSimple, ClockCounterClockwise, DotsThreeVerticalIcon  } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'

const springMenu = { type: 'spring' as const, stiffness: 400, damping: 24, mass: 0.7 }

const menuItems = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'bookmarks', label: 'Bookmarks', icon: BookmarkSimple },
  { id: 'history', label: 'History', icon: ClockCounterClockwise },
  { id: 'divider', label: '', icon: null },
  { id: 'settings', label: 'Settings', icon: Gear }
] as const

function AppMenuInner(): React.JSX.Element {
  const isOpen = useUIStore((s) => s.isMenuOpen)
  const setMenuOpen = useUIStore((s) => s.setMenuOpen)
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
    setMenuOpen(!isOpen)
  }, [isOpen, setMenuOpen])

  const handleClose = useCallback(() => setMenuOpen(false), [setMenuOpen])

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

  return (
    <div ref={containerRef} className="relative flex">
      <Button variant="icon" onClick={handleToggle} aria-label="Menu" aria-expanded={isOpen}>
        <DotsThreeVerticalIcon  size={18} weight="bold" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="absolute bottom-full mb-2 left-1/2 z-[100] min-w-[180px] rounded-xl overflow-hidden bg-white dark:bg-neutral-900 shadow-xl border border-gray-100 dark:border-neutral-700"
              style={{ originX: 0.5, originY: 1, x: '-50%', perspective: 600 }}
              initial={{ scaleX: 0.5, scaleY: 0.25, opacity: 0, y: 20, rotateX: -10 }}
              animate={{ scaleX: 1, scaleY: 1, opacity: 1, y: 0, rotateX: 0 }}
              exit={{ scaleX: 0.6, scaleY: 0.2, opacity: 0, y: 14, rotateX: -6 }}
              transition={{ ...springMenu, opacity: { duration: 0.12 } }}
            >
              <div className="p-1">
              {menuItems.map((item, idx) => {
                if (item.id === 'divider') {
                  return <div key="divider" className="border-t border-gray-100 dark:border-neutral-700 my-1" />
                }

                const Icon = item.icon!

                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuItemClick(item.id)}
                    className="w-full rounded-lg flex items-center gap-3 px-3.5 h-9 text-[13px] font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white active:scale-[0.97] transition-all duration-100 [app-region:no-drag]"
                    style={{
                      opacity: 0,
                      animation: `menu-item-in 150ms ease-out ${40 + idx * 30}ms forwards`
                    }}
                  >
                    <Icon size={16} weight="bold" />
                    <span>{item.label}</span>
                  </button>
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