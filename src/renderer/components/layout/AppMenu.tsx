import { memo, useCallback, useRef, useState } from 'react'
import { ListIcon, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { useTabStore } from '@/store/tabStore'
import { useSettingsPanelStore } from '@/store/settingsPanelStore'
import { useSpring, useMultiSpring, SPRINGS } from '@/hooks/useSpring'
import { MENU_ITEMS, MenuItemButton } from './MenuItems'

function AppMenuInner(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const popover = useMultiSpring(
    {
      scale: isOpen ? 1 : 0.92,
      opacity: isOpen ? 1 : 0,
      y: isOpen ? 0 : 6
    },
    isOpen ? SPRINGS.quick : SPRINGS.stiff
  )

  const iconRotation = useSpring(isOpen ? 90 : 0, SPRINGS.snappy)

  const handleToggle = useCallback(() => setIsOpen((p) => !p), [])
  const handleClose = useCallback(() => setIsOpen(false), [])

  const handleMenuItemClick = useCallback(
    (action: string) => {
      if (action === 'settings') {
        useSettingsPanelStore.getState().open()
      } else if (action === 'home') {
        useTabStore.getState().addTab('browser://newtab')
      }
      handleClose()
    },
    [handleClose]
  )

  return (
    <div ref={containerRef} className="relative">
      <Button variant="icon" onClick={handleToggle} aria-label="Menu" aria-expanded={isOpen}>
        <div style={{ transform: `rotate(${iconRotation}deg)`, display: 'flex' }}>
          {isOpen ? <X size={16} weight="bold" /> : <ListIcon size={18} weight="bold" />}
        </div>
      </Button>

      {(isOpen || (popover.opacity ?? 0) > 0.01) && (
        <>
          {isOpen && <div className="fixed inset-0 z-[90]" onMouseDown={handleClose} />}

          <div
            className="absolute bottom-full mb-2 left-1/2 z-[100] min-w-[160px] rounded-xl overflow-hidden bg-white/70 backdrop-blur-2xl shadow-xl border border-white/30"
            style={{
              transform: `translate(-50%, ${popover.y}px) scale(${popover.scale})`,
              opacity: popover.opacity,
              transformOrigin: 'bottom center',
              pointerEvents: isOpen ? 'auto' : 'none',
              willChange: 'transform, opacity'
            }}
          >
            {MENU_ITEMS.map((item, i) => (
              <MenuItemButton key={item.action} item={item} index={i} isOpen={isOpen} onClick={handleMenuItemClick} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export const AppMenu = memo(AppMenuInner)