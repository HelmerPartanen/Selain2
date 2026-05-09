import { useEffect, useRef } from 'react'
import { useTabStore } from '@/store/tabStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useUIStore } from '@/store/uiStore'
import { showToast } from '@/components/ui/Toast'

const MIN_TABS_FOR_SUGGESTION = 12
const MIN_MS_BETWEEN_SUGGESTIONS = 10 * 60 * 1000

export function useTabCleanupSuggestions(): void {
  const lastPromptRef = useRef(0)

  useEffect(() => {
    const unsubscribe = useTabStore.subscribe(
      (s) => s.tabOrder,
      (tabOrder) => {
        const now = Date.now()
        const settings = useSettingsStore.getState()
        if (!settings.showTabCleanupSuggestions) return

        if (tabOrder.length < MIN_TABS_FOR_SUGGESTION) return
        if (now - lastPromptRef.current < MIN_MS_BETWEEN_SUGGESTIONS) return

        lastPromptRef.current = now

        showToast({
          message: 'You have many tabs open. Review and clean up?',
          type: 'info',
          action: {
            label: 'Open overview',
            onClick: () => {
              const ui = useUIStore.getState()
              if (!ui.isTabOverviewOpen) {
                ui.toggleTabOverview()
              }
            }
          }
        })
      }
    )

    return unsubscribe
  }, [])
}

