import { memo, useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import homeSvg from '@/assets/icons/Interface/Home.svg?raw'
import bookmarkSvg from '@/assets/icons/Objects/Bookmark.svg?raw'
import counterclockwiseSvg from '@/assets/icons/Arrows/Counterclockwise.svg?raw'
import downloadSvg from '@/assets/icons/Objects/Tray_Arrow_Down.svg?raw'
import settingsSvg from '@/assets/icons/Objects/Settings.svg?raw'
import menuPointsSvg from '@/assets/icons/Interface/Menu_Points_2.svg?raw'
import searchSvg from '@/assets/icons/Objects/Search.svg?raw'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import filtrSvg from '@/assets/icons/Interface/Filtr.svg?raw'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'

const springMenu = { type: 'spring' as const, stiffness: 400, damping: 24, mass: 0.7 }

const menuItems = [
  { id: 'new-tab', label: 'New Tab', icon: plusSvg, shortcut: 'Ctrl+T' },
  { id: 'home', label: 'Home', icon: homeSvg, shortcut: '' },
  { id: 'divider', label: '', icon: null, shortcut: '' },
  { id: 'find', label: 'Find in Page', icon: searchSvg, shortcut: 'Ctrl+F' },
  { id: 'tab-overview', label: 'Tab Overview', icon: filtrSvg, shortcut: 'Ctrl+Shift+A' },
  { id: 'divider2', label: '', icon: null, shortcut: '' },
  { id: 'bookmarks', label: 'Bookmarks', icon: bookmarkSvg, shortcut: '' },
  { id: 'history', label: 'History', icon: counterclockwiseSvg, shortcut: '' },
  { id: 'downloads', label: 'Downloads', icon: downloadSvg, shortcut: '' },
  { id: 'divider3', label: '', icon: null, shortcut: '' },
  { id: 'settings', label: 'Settings', icon: settingsSvg, shortcut: '' }
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
      } else if (action === 'new-tab') {
        useTabStore.getState().addTab()
      } else if (action === 'bookmarks') {
        useUIStore.getState().toggleBookmarks()
      } else if (action === 'history') {
        useUIStore.getState().toggleHistory()
      } else if (action === 'downloads') {
        useUIStore.getState().toggleDownloads()
      } else if (action === 'find') {
        useUIStore.getState().toggleFindBar()
      } else if (action === 'tab-overview') {
        useUIStore.getState().toggleTabOverview()
      }
      handleClose()
    },
    [handleClose]
  )

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        aria-label="Menu"
        aria-expanded={isOpen}
        className="h-10 w-10 rounded-full flex items-center justify-center bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 shadow-lg text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-100 select-none"
      >
        <SvgIcon svg={menuPointsSvg} size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-away */}
            <div className="fixed inset-0 z-[99]" onMouseDown={handleClose} />
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
                if (item.id.startsWith('divider')) {
                  return <div key={item.id} className="border-t border-gray-100 dark:border-neutral-700 my-1" />
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
                    <SvgIcon svg={Icon} size={16} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-[11px] text-gray-400 dark:text-neutral-600 font-normal ml-2">
                        {item.shortcut}
                      </span>
                    )}
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