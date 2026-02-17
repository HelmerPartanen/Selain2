import { Globe, CircleNotch } from '@phosphor-icons/react'
import { useActiveTabId, useTabMeta } from '@/hooks/useTabSelector'

export function ActiveFavicon(): React.JSX.Element {
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
