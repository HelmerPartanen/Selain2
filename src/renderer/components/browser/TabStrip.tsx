import { memo, useCallback, useRef, type DragEvent } from 'react'
import { Plus } from '@phosphor-icons/react'
import { useTabOrder, useActiveTabId } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { Tab } from './Tab'
import { Button } from '@/components/ui/Button'

function TabStripInner(): React.JSX.Element {
  const tabOrder = useTabOrder()
  const activeTabId = useActiveTabId()
  const addTab = useTabStore((s) => s.addTab)
  const reorderTab = useTabStore((s) => s.reorderTab)
  const dragIndexRef = useRef<number>(-1)

  const handleAddTab = useCallback(() => {
    addTab()
  }, [addTab])

  const handleDragStart = useCallback((_e: DragEvent<HTMLDivElement>, index: number) => {
    dragIndexRef.current = index
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (_e: DragEvent<HTMLDivElement>, toIndex: number) => {
      const fromIndex = dragIndexRef.current
      if (fromIndex !== -1 && fromIndex !== toIndex) {
        reorderTab(fromIndex, toIndex)
      }
      dragIndexRef.current = -1
    },
    [reorderTab]
  )

  return (
    <div
      role="tablist"
      className="flex items-center gap-0.5 min-w-0 overflow-hidden px-1 [&::-webkit-scrollbar]:hidden"
    >
      {tabOrder.map((id, index) => (
        <Tab
          key={id}
          tabId={id}
          isActive={id === activeTabId}
          index={index}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      ))}

      <div className="flex-shrink-0 ml-0.5">
        <Button
          variant="icon"
          onClick={handleAddTab}
          aria-label="New tab"
        >
          <Plus size={16} weight="bold" />
        </Button>
      </div>
    </div>
  )
}

export const TabStrip = memo(TabStripInner)
