import { memo, useCallback, useState } from 'react'
import { List, House, Gear, BookmarkSimple, ClockCounterClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  isOpen: boolean
  onClick?: () => void
}

const SidebarItem = memo(function SidebarItem({ icon, label, isOpen, onClick }: SidebarItemProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex items-center gap-3 w-full h-9 px-3 rounded-md transition-colors duration-75 select-none"
      style={{ color: 'var(--text-secondary)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      <span className="flex-shrink-0">{icon}</span>
      {isOpen && <span className="text-xs truncate">{label}</span>}
    </button>
  )
})

function SidebarInner({ isOpen, onToggle }: SidebarProps): React.JSX.Element {
  return (
    <div
      className={`flex-shrink-0 flex flex-col glass transition-[width] duration-200 ease-out overflow-hidden ${
        isOpen ? 'w-52' : 'w-11'
      }`}
      style={{ borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}
    >
      <div className="flex items-center h-9 px-2 mt-1">
        <Button variant="icon" onClick={onToggle} aria-label="Toggle sidebar">
          <List size={18} weight="bold" />
        </Button>
      </div>

      <nav className="flex flex-col gap-0.5 px-1.5 mt-1">
        <SidebarItem icon={<House size={18} weight="regular" />} label="Home" isOpen={isOpen} />
        <SidebarItem icon={<BookmarkSimple size={18} weight="regular" />} label="Bookmarks" isOpen={isOpen} />
        <SidebarItem icon={<ClockCounterClockwise size={18} weight="regular" />} label="History" isOpen={isOpen} />
        <SidebarItem icon={<Gear size={18} weight="regular" />} label="Settings" isOpen={isOpen} />
      </nav>
    </div>
  )
}

export const Sidebar = memo(SidebarInner)

export function useSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  return { isOpen, toggle } as const
}
