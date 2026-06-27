import { useEffect, useRef } from 'react'
import { useTabStore } from '@/store/tabStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useUIStore } from '@/store/uiStore'
import { showToast } from '@/components/ui/toastStore'
import { countDuplicateGroups, findDuplicateTabIds } from '@/utils/tabAnalysis'

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
        const tabs = useTabStore.getState().tabs
        const duplicateGroups = countDuplicateGroups(tabOrder, tabs)
        const duplicateIds = findDuplicateTabIds(tabOrder, tabs)
        const inactiveIds = tabOrder.filter((id) => id !== useTabStore.getState().activeTabId && !tabs[id]?.pinned && !tabs[id]?.isSuspended)
        const message = duplicateGroups > 0
          ? `${duplicateGroups} duplicate tab ${duplicateGroups === 1 ? 'set' : 'sets'} found. Review cleanup?`
          : inactiveIds.length > 4
            ? `Sleep ${inactiveIds.length} background tabs to save memory?`
            : 'You have many tabs open. Review and clean up?'

        showToast({
          message,
          type: 'info',
          action: {
            label: duplicateGroups > 0 ? 'Review' : inactiveIds.length > 4 ? 'Sleep' : 'Open overview',
            onClick: () => {
              if (duplicateGroups === 0 && inactiveIds.length > 4) {
                inactiveIds.forEach((id) => useTabStore.getState().suspendTab(id, 'cleanup'))
                return
              }
              if (duplicateIds.size > 0) {
                // The overview highlights duplicates and exposes the bulk cleanup action.
              }
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

