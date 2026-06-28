import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createIPCStorage } from './ipcStorage'
import { logger } from '@/utils/logger'
import { useAccountStore } from './accountStore'

export type SitePermissionDecision = 'allow' | 'deny' | 'ask'

export type SitePermission =
  | 'clipboard-read'
  | 'clipboard-sanitized-write'
  | 'media'
  | 'fullscreen'
  | 'media-key-system-access'
  | 'protected-media-identifier'
  | string

export interface SitePermissionEntry {
  origin: string
  accountId: string
  permission: SitePermission
  decision: SitePermissionDecision
  updatedAt: number
}

interface SitePermissionsState {
  entries: Record<string, SitePermissionEntry>
  getDecision: (origin: string, permission: SitePermission) => SitePermissionDecision
  setDecision: (origin: string, permission: SitePermission, decision: SitePermissionDecision) => void
  resetOrigin: (origin: string) => void
  resetPermission: (origin: string, permission: SitePermission) => void
  listForOrigin: (origin: string) => SitePermissionEntry[]
  listAll: () => SitePermissionEntry[]
}

function keyFor(origin: string, permission: SitePermission): string {
  const accountId = useAccountStore.getState().activeAccountId
  return `${accountId}::${origin}::${permission}`
}

export function getOriginFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.origin
  } catch {
    return null
  }
}

export const SITE_PERMISSION_LABELS: Record<string, string> = {
  'clipboard-read': 'Clipboard read',
  'clipboard-sanitized-write': 'Clipboard write',
  media: 'Camera and microphone',
  fullscreen: 'Fullscreen',
  'media-key-system-access': 'Protected media',
  'protected-media-identifier': 'Protected media ID',
}

export const useSitePermissionsStore = create<SitePermissionsState>()(
  persist(
    (set, get) => ({
      entries: {},

      getDecision: (origin, permission) => {
        return get().entries[keyFor(origin, permission)]?.decision ?? 'ask'
      },

      setDecision: (origin, permission, decision) => {
        if (!origin || !permission) return
        set((state) => {
          const key = keyFor(origin, permission)
          return {
            entries: {
              ...state.entries,
              [key]: { origin, accountId: useAccountStore.getState().activeAccountId, permission, decision, updatedAt: Date.now() },
            },
          }
        })
      },

      resetOrigin: (origin) => {
        set((state) => {
          const entries = { ...state.entries }
          for (const [key, entry] of Object.entries(entries)) {
            if (entry.origin === origin && entry.accountId === useAccountStore.getState().activeAccountId) delete entries[key]
          }
          return { entries }
        })
      },

      resetPermission: (origin, permission) => {
        set((state) => {
          const entries = { ...state.entries }
          delete entries[keyFor(origin, permission)]
          return { entries }
        })
      },

      listForOrigin: (origin) => {
        return Object.values(get().entries)
          .filter((entry) => entry.origin === origin && entry.accountId === useAccountStore.getState().activeAccountId)
          .sort((a, b) => a.permission.localeCompare(b.permission))
      },

      listAll: () => {
        return Object.values(get().entries).sort((a, b) => b.updatedAt - a.updatedAt)
      },
    }),
    {
      name: 'site-permissions',
      version: 1,
      storage: createIPCStorage<SitePermissionsState>({
        onParseError(name) {
          logger.error(`[sitePermissionsStore] Corrupted persisted data for '${name}' detected; starting fresh`)
        },
      }),
    },
  ),
)
