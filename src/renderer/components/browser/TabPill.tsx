import { memo, useCallback, useEffect, useState } from 'react'
import { Plus, X, Globe, CircleNotch } from '@phosphor-icons/react'
import { useTabOrder, useActiveTabId, useTabMeta } from '@/hooks/useTabSelector'
import { useTabStore } from '@/store/tabStore'
import { Button } from '@/components/ui/Button'

/* ── Active tab favicon (compact) ────────────────────────────────────────── */

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

/* ── Individual row in expanded tab list ─────────────────────────────────── */

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
    <button
      onClick={handleClick}
      className="group flex items-center gap-2.5 w-full px-2.5 h-8 rounded-lg transition-colors duration-75 text-left"
      style={{
        background: isActive ? 'var(--bg-surface)' : 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        animation: `tabRowIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) ${index * 25}ms both`
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = 'var(--bg-surface-hover)'
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent'
      }}
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
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-surface-active)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
        style={{ color: 'var(--text-muted)' }}
      >
        <X size={11} weight="bold" />
      </div>
    </button>
  )
})

/* ── Main TabPill component ──────────────────────────────────────────────── */

function TabPillInner(): React.JSX.Element {
  const tabOrder = useTabOrder()
  const activeTabId = useActiveTabId()
  const addTab = useTabStore((s) => s.addTab)
  const tabCount = tabOrder.length
  const [isExpanded, setIsExpanded] = useState(false)

  // Auto-close popup when down to 1 tab
  useEffect(() => {
    if (tabCount <= 1) setIsExpanded(false)
  }, [tabCount])

  const handleAddTab = useCallback(() => {
    addTab()
  }, [addTab])

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setIsExpanded(false)
  }, [])

 return (
  <div className="relative">
    {/* Expanded tab list — flies up from the pill */}
    {isExpanded && (
      <>
        <div
          className="fixed inset-0 z-[90]"
          onMouseDown={handleClose}
        />

        <div
          className="
            absolute bottom-full mb-2 right-0
            rounded-xl overflow-hidden z-[100]
            min-w-[230px] max-w-[290px] p-1
            bg-white/80 backdrop-blur-xl
            shadow-xl
            origin-bottom-right
            animate-[tabListIn_0.35s_cubic-bezier(0.34,1.56,0.64,1)_both]
          "
        >
          <div className="max-h-[320px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1">
            {tabOrder.map((id, index) => (
              <TabRow
                key={id}
                tabId={id}
                isActive={id === activeTabId}
                index={index}
                onSelect={handleClose}
              />
            ))}
          </div>
        </div>
      </>
    )}

    {/* Compact pill */}
<div
  className={`
    flex items-center justify-center
    bg-white/70 backdrop-blur-md shadow-lg
    transition-all duration-300
    ${
      tabCount === 1
        ? 'h-10 w-10 rounded-full'
        : 'h-10 px-1 gap-0.5 rounded-full'
    }
  `}
>
  <Button variant="icon" onClick={handleAddTab} aria-label="New tab">
    <Plus size={15} weight="bold" />
  </Button>

  {tabCount > 1 && (
    <button
      onClick={handleToggle}
      className="
        flex items-center gap-1.5 h-7 px-2 rounded-full
        text-gray-600
        transition-colors duration-75
        hover:bg-gray-200/60
        active:bg-gray-300/60
      "
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
