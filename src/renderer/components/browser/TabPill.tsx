import { memo, useCallback, useEffect, useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { useTabOrder, useActiveTabId } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { Button } from '@/components/ui/Button'
import { useSpring, useMultiSpring, SPRINGS } from '@/hooks/useSpring'
import { TabRow } from './TabRow'
import { ActiveFavicon } from './ActiveFavicon'

function TabPillInner(): React.JSX.Element {
  const tabOrder = useTabOrder()
  const activeTabId = useActiveTabId()
  const addTab = useTabStore((s) => s.addTab)
  const tabCount = tabOrder.length
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (tabCount <= 1) setIsExpanded(false)
  }, [tabCount])

  const popover = useMultiSpring(
    {
      scale: isExpanded ? 1 : 0.92,
      opacity: isExpanded ? 1 : 0,
      y: isExpanded ? 0 : 6
    },
    isExpanded ? SPRINGS.quick : SPRINGS.stiff
  )

  const pillWidth = useSpring(tabCount === 1 ? 40 : 76, SPRINGS.stiff)

  const handleAddTab = useCallback(() => addTab(), [addTab])
  const handleToggle = useCallback(() => setIsExpanded((p) => !p), [])
  const handleClose = useCallback(() => setIsExpanded(false), [])

  return (
    <div className="relative">
      {(isExpanded || (popover.opacity ?? 0) > 0.01) && (
        <>
          {isExpanded && <div className="fixed inset-0 z-[90]" onMouseDown={handleClose} />}
          <div
            className="absolute bottom-full mb-2 right-0 rounded-xl overflow-hidden z-[100] min-w-[230px] max-w-[290px] p-1 bg-white/70 backdrop-blur-2xl shadow-xl border border-white/30"
            style={{
              transform: `translateY(${popover.y}px) scale(${popover.scale})`,
              opacity: popover.opacity,
              transformOrigin: 'bottom right',
              pointerEvents: isExpanded ? 'auto' : 'none',
              willChange: 'transform, opacity'
            }}
          >
            <div className="max-h-[320px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1">
              {tabOrder.map((id, index) => (
                <TabRow
                  key={id}
                  tabId={id}
                  isActive={id === activeTabId}
                  index={index}
                  isOpen={isExpanded}
                  onSelect={handleClose}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <div
        className="flex items-center justify-center h-10 rounded-full bg-white/60 backdrop-blur-2xl shadow-lg border border-white/30"
        style={{ width: pillWidth, willChange: 'width' }}
      >
        <Button variant="icon" onClick={handleAddTab} aria-label="New tab">
          <Plus size={15} weight="bold" />
        </Button>

        {tabCount > 1 && (
          <button
            onClick={handleToggle}
            className="flex items-center gap-1.5 h-7 px-2 rounded-full text-gray-600 transition-colors duration-75 hover:bg-gray-200/60 active:bg-gray-300/60"
          >
            <ActiveFavicon />
            <span className="text-xs font-medium tabular-nums">{tabCount}</span>
          </button>
        )}
      </div>
    </div>
  )
}

export const TabPill = memo(TabPillInner)
