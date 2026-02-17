import { memo, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, X, Globe, CircleNotch } from '@phosphor-icons/react'
import { useTabOrder, useActiveTabId, useTabMeta } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { Button } from '@/components/ui/Button'

const springPill = { type: 'spring' as const, stiffness: 400, damping: 28 }
const springDropdown = { type: 'spring' as const, stiffness: 480, damping: 26 }
const springRow = { type: 'spring' as const, stiffness: 420, damping: 24 }

function ActiveFavicon(): React.JSX.Element {
  const activeTabId = useActiveTabId()
  const meta = useTabMeta(activeTabId ?? '')
  const favicon = meta?.favicon
  const isLoading = meta?.isLoading ?? false

  if (isLoading) {
    return <CircleNotch size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} weight="bold" />
  }
  if (favicon) {
    return <img src={favicon} alt="" className="w-3.5 h-3.5 rounded-sm" draggable={false} />
  }
  return <Globe size={14} style={{ color: 'var(--text-muted)' }} weight="regular" />
}

const TabRow = memo(function TabRow({
  tabId,
  isActive,
  index,
  onSelect
}: {
  tabId: string
  isActive: boolean
  index: number
  onSelect: () => void
}): React.JSX.Element {
  const meta = useTabMeta(tabId)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const removeTab = useTabStore((s) => s.removeTab)

  const title = meta?.title ?? 'New Tab'
  const favicon = meta?.favicon
  const isLoading = meta?.isLoading ?? false

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
    <motion.button
      onClick={handleClick}
      className="group flex items-center gap-2.5 w-full px-2.5 h-8 rounded-lg text-left"
      layout
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
      transition={{ ...springRow, delay: index * 0.03 }}
      style={{
        background: isActive ? 'var(--bg-surface)' : 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
      }}
      whileHover={{
        backgroundColor: isActive ? undefined : 'var(--bg-surface-hover)',
        x: 1
      }}
      whileTap={{ scale: 0.98 }}
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

      <motion.div
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer"
        onClick={handleClose}
        whileHover={{ scale: 1.15, backgroundColor: 'var(--bg-surface-active)' }}
        whileTap={{ scale: 0.9 }}
        style={{ color: 'var(--text-muted)' }}
      >
        <X size={11} weight="bold" />
      </motion.div>
    </motion.button>
  )
})

function TabPillInner(): React.JSX.Element {
  const tabOrder = useTabOrder()
  const activeTabId = useActiveTabId()
  const addTab = useTabStore((s) => s.addTab)
  const tabCount = tabOrder.length
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (tabCount <= 1) setIsExpanded(false)
  }, [tabCount])

  const handleAddTab = useCallback(() => addTab(), [addTab])
  const handleToggle = useCallback(() => setIsExpanded((prev) => !prev), [])
  const handleClose = useCallback(() => setIsExpanded(false), [])

  return (
    <div className="relative">
      <AnimatePresence>
        {isExpanded && (
          <>
            <div className="fixed inset-0 z-[90]" onMouseDown={handleClose} />

            <motion.div
              className="absolute bottom-full mb-2 right-0 rounded-xl overflow-hidden z-[100] min-w-[230px] max-w-[290px] p-1 bg-white shadow-xl"
              style={{ originX: 1, originY: 1 }}
              initial={{ scale: 0.85, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 8 }}
              transition={springDropdown}
            >
              <div className="max-h-[320px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1">
                <AnimatePresence initial={false}>
                  {tabOrder.map((id, index) => (
                    <TabRow
                      key={id}
                      tabId={id}
                      isActive={id === activeTabId}
                      index={index}
                      onSelect={handleClose}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div
  className={`
    flex items-center justify-center
    bg-white shadow-lg
    rounded-full h-10
    ${tabCount > 1 ? 'px-1 gap-0.5' : 'w-10'}
  `}
>
  <Button variant="icon" onClick={handleAddTab} aria-label="New tab">
    <Plus size={15} weight="bold" />
  </Button>

  {tabCount > 1 && (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1.5 h-7 px-2 rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200"
    >
      <ActiveFavicon />
      <span className="text-xs font-medium tabular-nums">
        {tabCount}
      </span>
    </button>
  )}
</div>

    </div>
  )
}

export const TabPill = memo(TabPillInner)
