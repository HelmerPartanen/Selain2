import { useEffect, useState } from 'react'
import { House, Gear, BookmarkSimple, ClockCounterClockwise } from '@phosphor-icons/react'
import { useSpring, SPRINGS } from '@/hooks/useSpring'

interface MenuItem {
  action: string
  label: string
  icon: React.ReactNode
  showDividerAfter?: boolean
}

export const MENU_ITEMS: MenuItem[] = [
  { action: 'home', label: 'Home', icon: <House size={16} weight="regular" /> },
  { action: 'bookmarks', label: 'Bookmarks', icon: <BookmarkSimple size={16} weight="regular" /> },
  { action: 'history', label: 'History', icon: <ClockCounterClockwise size={16} weight="regular" />, showDividerAfter: true },
  { action: 'settings', label: 'Settings', icon: <Gear size={16} weight="regular" /> }
]

interface MenuItemButtonProps {
  item: MenuItem
  index: number
  isOpen: boolean
  onClick: (action: string) => void
}

export function MenuItemButton({ item, index, isOpen, onClick }: MenuItemButtonProps): React.JSX.Element {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setVisible(true), index * 40)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [isOpen, index])

  const y = useSpring(visible ? 0 : 8, SPRINGS.bouncy)
  const opacity = useSpring(visible ? 1 : 0, SPRINGS.snappy)

  return (
    <>
      <button
        onClick={() => onClick(item.action)}
        className="w-full flex items-center gap-3 px-3 h-9 text-sm text-gray-600 transition-colors duration-75 hover:bg-gray-200/60 hover:text-gray-900 active:bg-gray-300/60 [app-region:no-drag]"
        style={{
          transform: `translateY(${y}px)`,
          opacity,
          willChange: 'transform, opacity'
        }}
      >
        {item.icon}
        <span>{item.label}</span>
      </button>
      {item.showDividerAfter && <div className="border-t border-gray-200 my-1" />}
    </>
  )
}
