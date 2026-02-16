import { memo, useCallback, type DragEvent } from 'react'
import { X, CircleNotch, Globe } from '@phosphor-icons/react'
import { useTabMeta } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'

interface TabProps {
  tabId: string
  isActive: boolean
  index: number
  onDragStart: (e: DragEvent<HTMLDivElement>, index: number) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDrop: (e: DragEvent<HTMLDivElement>, index: number) => void
}

function TabInner({ tabId, isActive, index, onDragStart, onDragOver, onDrop }: TabProps): React.JSX.Element {
  const meta = useTabMeta(tabId)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const removeTab = useTabStore((s) => s.removeTab)

  const handleClick = useCallback(() => {
    setActiveTab(tabId)
  }, [tabId, setActiveTab])

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      removeTab(tabId)
    },
    [tabId, removeTab]
  )

  const handleDragStartLocal = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      onDragStart(e, index)
    },
    [onDragStart, index]
  )

  const handleDropLocal = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      onDrop(e, index)
    },
    [onDrop, index]
  )

  const title = meta?.title ?? 'New Tab'
  const favicon = meta?.favicon
  const isLoading = meta?.isLoading ?? false

  return (
    <div
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      draggable
      onDragStart={handleDragStartLocal}
      onDragOver={onDragOver}
      onDrop={handleDropLocal}
      onClick={handleClick}
      className={`group relative flex items-center gap-2 flex-1 min-w-0 h-8 px-3 rounded-md cursor-default select-none transition-colors duration-75 [app-region:no-drag] ${
        isActive
          ? 'bg-white/10 text-text'
          : 'text-text-muted hover:bg-white/5 hover:text-text'
      }`}
    >
      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
        {isLoading ? (
          <CircleNotch size={14} className="animate-spin text-text-muted" weight="bold" />
        ) : favicon ? (
          <img src={favicon} alt="" className="w-4 h-4 rounded-sm" draggable={false} />
        ) : (
          <Globe size={14} className="text-text-dim" weight="regular" />
        )}
      </div>

      <span className="flex-1 text-xs truncate leading-none">{title}</span>

      <button
        onClick={handleClose}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-danger hover:text-white transition-all duration-75"
        aria-label={`Close ${title}`}
      >
        <X size={12} weight="bold" />
      </button>
    </div>
  )
}

export const Tab = memo(TabInner, (prev, next) => {
  return prev.tabId === next.tabId && prev.isActive === next.isActive && prev.index === next.index
})
