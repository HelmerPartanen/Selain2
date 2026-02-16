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
    <div ref={containerRef}>
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
          <div
            className="fixed inset-0 z-[90]"
            onMouseDown={handleClose}
          />
          <div
            className="fixed glass-heavy rounded-xl overflow-hidden z-[100] min-w-[160px]"
            style={{
              bottom: `${menuPosition.bottom}px`,
              left: `${menuPosition.left}px`,
              boxShadow: 'var(--shadow-glass)'
            }}
          >
            <button
              onClick={() => handleMenuItemClick('home')}
              className="w-full flex items-center gap-3 px-3 h-9 transition-colors duration-75 text-sm [app-region:no-drag]"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <House size={16} weight="regular" />
              <span>Home</span>
            </button>

            <button
              onClick={() => handleMenuItemClick('bookmarks')}
              className="w-full flex items-center gap-3 px-3 h-9 transition-colors duration-75 text-sm [app-region:no-drag]"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <BookmarkSimple size={16} weight="regular" />
              <span>Bookmarks</span>
            </button>

            <button
              onClick={() => handleMenuItemClick('history')}
              className="w-full flex items-center gap-3 px-3 h-9 transition-colors duration-75 text-sm [app-region:no-drag]"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <ClockCounterClockwise size={16} weight="regular" />
              <span>History</span>
            </button>

            <div style={{ borderTop: '0.5px solid var(--border-glass)' }} />

            <button
              onClick={() => handleMenuItemClick('settings')}
              className="w-full flex items-center gap-3 px-3 h-9 transition-colors duration-75 text-sm [app-region:no-drag]"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
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
