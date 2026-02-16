import { memo, useCallback, useRef, useState } from 'react'
import { House, Gear, BookmarkSimple, ClockCounterClockwise, DotsThreeVertical, ListIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { useTabStore } from '@/store/tabStore'

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
    <div ref={containerRef} className="relative [app-region:no-drag] pl-1">
      <div className="rounded-full border-gradient">
        <div className="flex items-center bg-[#222224] rounded-full">
          <Button
            variant="icon"
            onClick={handleToggle}
            aria-label="Menu"
            aria-expanded={isOpen}
          >
            <ListIcon size={18} weight="bold" />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-neutral-800 border border-neutral-800 rounded-lg shadow-xl shadow-black/30 overflow-hidden z-50 min-w-[160px]">
          <button
            onClick={() => handleMenuItemClick('home')}
            className="w-full flex items-center gap-3 px-3 h-9 text-zinc-400 hover:text-zinc-100 hover:bg-neutral-700 transition-colors duration-75 text-sm [app-region:no-drag]"
          >
            <House size={16} weight="regular" />
            <span>Home</span>
          </button>

          <button
            onClick={() => handleMenuItemClick('bookmarks')}
            className="w-full flex items-center gap-3 px-3 h-9 text-zinc-400 hover:text-zinc-100 hover:bg-neutral-700 transition-colors duration-75 text-sm [app-region:no-drag]"
          >
            <BookmarkSimple size={16} weight="regular" />
            <span>Bookmarks</span>
          </button>

          <button
            onClick={() => handleMenuItemClick('history')}
            className="w-full flex items-center gap-3 px-3 h-9 text-zinc-400 hover:text-zinc-100 hover:bg-neutral-700 transition-colors duration-75 text-sm [app-region:no-drag]"
          >
            <ClockCounterClockwise size={16} weight="regular" />
            <span>History</span>
          </button>

          <div className="border-t border-neutral-700" />

          <button
            onClick={() => handleMenuItemClick('settings')}
            className="w-full flex items-center gap-3 px-3 h-9 text-zinc-400 hover:text-zinc-100 hover:bg-neutral-700 transition-colors duration-75 text-sm [app-region:no-drag]"
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
