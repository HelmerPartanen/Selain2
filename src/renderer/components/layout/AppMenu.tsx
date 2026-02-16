import { memo, useCallback, useRef, useState } from 'react'
import { House, Gear, BookmarkSimple, ClockCounterClockwise, DotsThreeVertical } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'

function AppMenuInner(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleMenuItemClick = useCallback(
    (_action: string) => {
      // Handle menu item clicks here (Home, Bookmarks, History, Settings)
      handleClose()
    },
    [handleClose]
  )

  return (
    <div ref={containerRef} className="relative [app-region:no-drag]">
      <Button
        variant="icon"
        onClick={handleToggle}
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <DotsThreeVertical size={18} weight="bold" />
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-surface-raised border border-border rounded-lg shadow-xl shadow-black/30 overflow-hidden z-50 min-w-[160px]">
          <button
            onClick={() => handleMenuItemClick('home')}
            className="w-full flex items-center gap-3 px-3 h-9 text-text-muted hover:text-text hover:bg-surface-hover transition-colors duration-75 text-sm [app-region:no-drag]"
          >
            <House size={16} weight="regular" />
            <span>Home</span>
          </button>

          <button
            onClick={() => handleMenuItemClick('bookmarks')}
            className="w-full flex items-center gap-3 px-3 h-9 text-text-muted hover:text-text hover:bg-surface-hover transition-colors duration-75 text-sm [app-region:no-drag]"
          >
            <BookmarkSimple size={16} weight="regular" />
            <span>Bookmarks</span>
          </button>

          <button
            onClick={() => handleMenuItemClick('history')}
            className="w-full flex items-center gap-3 px-3 h-9 text-text-muted hover:text-text hover:bg-surface-hover transition-colors duration-75 text-sm [app-region:no-drag]"
          >
            <ClockCounterClockwise size={16} weight="regular" />
            <span>History</span>
          </button>

          <div className="border-t border-border" />

          <button
            onClick={() => handleMenuItemClick('settings')}
            className="w-full flex items-center gap-3 px-3 h-9 text-text-muted hover:text-text hover:bg-surface-hover transition-colors duration-75 text-sm [app-region:no-drag]"
          >
            <Gear size={16} weight="regular" />
            <span>Settings</span>
          </button>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onMouseDown={handleClose}
        />
      )}
    </div>
  )
}

export const AppMenu = memo(AppMenuInner)
