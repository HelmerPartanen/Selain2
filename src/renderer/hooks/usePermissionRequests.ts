import { useEffect } from 'react'
import { showToast } from '@/components/ui/toastStore'
import {
  SITE_PERMISSION_LABELS,
  useSitePermissionsStore,
  type SitePermission,
} from '@/store/sitePermissionsStore'

export function usePermissionRequests(): void {
  useEffect(() => {
    return window.electronAPI.onPermissionRequest((request) => {
      const store = useSitePermissionsStore.getState()
      const permission = request.permission as SitePermission
      const existing = store.getDecision(request.origin, permission)

      if (existing === 'allow' || existing === 'deny') {
        window.electronAPI.respondToPermissionRequest(request.id, existing)
        return
      }

      let settled = false
      const denyTimer = window.setTimeout(() => {
        if (settled) return
        settled = true
        window.electronAPI.respondToPermissionRequest(request.id, 'deny')
      }, 14000)

      const label = SITE_PERMISSION_LABELS[request.permission] ?? request.permission
      showToast({
        type: 'info',
        message: `${request.origin} wants ${label.toLowerCase()}`,
        action: {
          label: 'Allow',
          onClick: () => {
            if (settled) return
            settled = true
            window.clearTimeout(denyTimer)
            store.setDecision(request.origin, permission, 'allow')
            window.electronAPI.respondToPermissionRequest(request.id, 'allow')
          },
        },
      })
    })
  }, [])
}
