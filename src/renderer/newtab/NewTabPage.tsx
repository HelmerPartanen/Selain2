import { memo, useCallback } from 'react'
import { Gear } from '@phosphor-icons/react'
import { useSettingsPanelStore } from '@/store/settingsPanelStore'

function NewTabPageInner(): React.JSX.Element {
  const openSettings = useCallback(() => useSettingsPanelStore.getState().open(), [])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
      <button
        onClick={openSettings}
        className="absolute bottom-6 right-6 z-10 flex items-center gap-2 px-4 py-2 rounded-full glass-surface transition-colors duration-150 text-sm"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <Gear size={16} weight="regular" />
        Customize
      </button>
    </div>
  )
}

export const NewTabPage = memo(NewTabPageInner)
