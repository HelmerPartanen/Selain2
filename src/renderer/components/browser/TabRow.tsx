import { memo, useCallback, useEffect, useState } from 'react'
import { X, Globe, CircleNotch } from '@phosphor-icons/react'
import { useTabMeta } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { useSpring, SPRINGS } from '@/hooks/useSpring'

interface TabRowProps {
  tabId: string
  isActive: boolean
  index: number
  isOpen: boolean
  onSelect: () => void
}

const TabRow = memo(function TabRow({ tabId, isActive, index, isOpen, onSelect }: TabRowProps): React.JSX.Element {
  const meta = useTabMeta(tabId)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const removeTab = useTabStore((s) => s.removeTab)

  const title = meta?.title ?? 'New Tab'
  const favicon = meta?.favicon
  const isLoading = meta?.isLoading ?? false

  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setVisible(true), index * 30)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [isOpen, index])

  const y = useSpring(visible ? 0 : 6, SPRINGS.bouncy)
  const opacity = useSpring(visible ? 1 : 0, SPRINGS.snappy)

  const handleClick = useCallback(() => {
    setActiveTab(tabId)
    onSelect()
  }, [tabId, setActiveTab, onSelect])

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      removeTab(tabId)
    },
    [tabId, removeTab]
  )

  return (
    <button
      onClick={handleClick}
      className="group flex items-center gap-2.5 w-full px-2.5 h-8 rounded-lg transition-colors duration-75 text-left"
      style={{
        background: isActive ? 'var(--bg-surface)' : 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        transform: `translateY(${y}px)`,
        opacity,
        willChange: 'transform, opacity'
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-surface-hover)' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
        {isLoading ? (
          <CircleNotch size={13} className="animate-spin" style={{ color: 'var(--text-muted)' }} weight="bold" />
        ) : favicon ? (
          <img src={favicon} alt="" className="w-4 h-4 rounded-sm" draggable={false} />
        ) : (
          <Globe size={13} style={{ color: 'var(--text-muted)' }} weight="regular" />
        )}
      </div>

      <span className="flex-1 text-xs truncate">{title}</span>

      <div
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-75 cursor-pointer"
        onClick={handleClose}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-active)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        style={{ color: 'var(--text-muted)' }}
      >
        <X size={11} weight="bold" />
      </div>
    </button>
  )
})

export { TabRow }
