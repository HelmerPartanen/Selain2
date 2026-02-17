import { memo, useCallback, useRef, useState } from 'react'
import { House, Gear, BookmarkSimple, ClockCounterClockwise, ListIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { useTabStore } from '@/store/tabStore'

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

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleMenuItemClick = useCallback(
    (action: string) => {
      if (action === 'settings') {
        useTabStore.getState().addTab('browser://settings')
      } else if (action === 'home') {
        useTabStore.getState().addTab('browser://newtab')
      }
      handleClose()
    },
    [handleClose]
  )

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="icon"
        onClick={handleToggle}
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <ListIcon size={18} weight="bold" />
      </Button>

      {isOpen && (
        <>
          {/* Click outside overlay */}
          <div
            className="fixed inset-0 z-[90]"
            onMouseDown={handleClose}
          />

          {/* Dropdown */}
          <div
            className="
              absolute bottom-full mb-2 left-1/2 -translate-x-1/2
              z-[100] min-w-[160px]
              rounded-xl overflow-hidden
              bg-white/80 backdrop-blur-xl
              shadow-xl
              origin-bottom
              animate-[tabListIn_0.25s_cubic-bezier(0.16,1,0.3,1)_both]
            "
          >
            {/* Home */}
            <button
              onClick={() => handleMenuItemClick('home')}
              className="
                w-full flex items-center gap-3 px-3 h-9
                text-sm text-gray-600
                transition-colors duration-75
                hover:bg-gray-200/60 hover:text-gray-900
                active:bg-gray-300/60
                [app-region:no-drag]
              "
            >
              <House size={16} weight="regular" />
              <span>Home</span>
            </button>

            {/* Bookmarks */}
            <button
              onClick={() => handleMenuItemClick('bookmarks')}
              className="
                w-full flex items-center gap-3 px-3 h-9
                text-sm text-gray-600
                transition-colors duration-75
                hover:bg-gray-200/60 hover:text-gray-900
                active:bg-gray-300/60
                [app-region:no-drag]
              "
            >
              <BookmarkSimple size={16} weight="regular" />
              <span>Bookmarks</span>
            </button>

            {/* History */}
            <button
              onClick={() => handleMenuItemClick('history')}
              className="
                w-full flex items-center gap-3 px-3 h-9
                text-sm text-gray-600
                transition-colors duration-75
                hover:bg-gray-200/60 hover:text-gray-900
                active:bg-gray-300/60
                [app-region:no-drag]
              "
            >
              <ClockCounterClockwise size={16} weight="regular" />
              <span>History</span>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-200 my-1" />

            {/* Settings */}
            <button
              onClick={() => handleMenuItemClick('settings')}
              className="
                w-full flex items-center gap-3 px-3 h-9
                text-sm text-gray-600
                transition-colors duration-75
                hover:bg-gray-200/60 hover:text-gray-900
                active:bg-gray-300/60
                [app-region:no-drag]
              "
            >
              <Gear size={16} weight="regular" />
              <span>Settings</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export const AppMenu = memo(AppMenuInner)