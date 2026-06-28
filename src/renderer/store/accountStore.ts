import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { createIPCStorage } from './ipcStorage'
import { logger } from '@/utils/logger'
import type { PrivacyProfile } from './settingsStore'

export const DEFAULT_ACCOUNT_ID = 'default'
export const DEFAULT_SPACE_ID = 'general'

export interface AccountSpace {
  id: string
  accountId: string
  name: string
  hue: number
  tabIds: string[]
  activeTabId: string | null
  privacyProfile: PrivacyProfile
  createdAt: number
  updatedAt: number
}

export interface BrowserAccount {
  id: string
  name: string
  colorHue: number
  avatarDataUrl: string | null
  requirePassword: boolean
  passwordHash: string | null
  partitionId: string
  spaceOrder: string[]
  spaces: Record<string, AccountSpace>
  activeSpaceId: string
  createdAt: number
  updatedAt: number
}

export interface AccountStore {
  accounts: Record<string, BrowserAccount>
  accountOrder: string[]
  activeAccountId: string
  unlockedAccountIds: string[]
  addAccount: (name: string) => string
  renameAccount: (id: string, name: string) => void
  setAccountColor: (id: string, hue: number) => void
  setAccountAvatar: (id: string, avatarDataUrl: string | null) => void
  setAccountPassword: (id: string, passwordHash: string | null) => void
  setRequirePassword: (id: string, requirePassword: boolean) => void
  removeAccount: (id: string) => void
  unlockAccount: (id: string) => void
  switchAccount: (id: string) => void
  addSpace: (name: string, hue: number) => string
  renameSpace: (spaceId: string, name: string) => void
  setSpaceHue: (spaceId: string, hue: number) => void
  removeSpace: (spaceId: string) => void
  switchSpace: (spaceId: string) => void
  assignTabToActiveSpace: (tabId: string) => void
  moveTabToSpace: (tabId: string, targetSpaceId: string) => void
  removeTabRefs: (tabId: string) => void
  setActiveTabForCurrentSpace: (tabId: string | null) => void
}

function createSpace(accountId: string, id: string, name: string, hue = -1): AccountSpace {
  const now = Date.now()
  return {
    id,
    accountId,
    name,
    hue,
    tabIds: [],
    activeTabId: null,
    privacyProfile: 'standard',
    createdAt: now,
    updatedAt: now,
  }
}

function createAccount(id: string, name: string): BrowserAccount {
  const now = Date.now()
  const general = createSpace(id, DEFAULT_SPACE_ID, 'General')
  const hue = id === DEFAULT_ACCOUNT_ID ? 210 : Math.floor(Math.random() * 300) + 20
  return {
    id,
    name,
    colorHue: hue,
    avatarDataUrl: null,
    requirePassword: false,
    passwordHash: null,
    partitionId: id === DEFAULT_ACCOUNT_ID ? 'persist:default' : `persist:account-${id}`,
    spaceOrder: [DEFAULT_SPACE_ID],
    spaces: { [DEFAULT_SPACE_ID]: general },
    activeSpaceId: DEFAULT_SPACE_ID,
    createdAt: now,
    updatedAt: now,
  }
}

function normalizeAccount(account: Partial<BrowserAccount> & Pick<BrowserAccount, 'id'>): BrowserAccount {
  const fallback = createAccount(account.id, account.name || 'Account')
  const spaces = Object.fromEntries(
    Object.entries(account.spaces ?? fallback.spaces).map(([id, space]) => {
      const normalized = {
        ...createSpace(account.id, id, space?.name || (id === DEFAULT_SPACE_ID ? 'General' : 'Space')),
        ...space,
        id,
        accountId: account.id,
        tabIds: Array.isArray(space?.tabIds) ? space.tabIds : [],
        activeTabId: space?.activeTabId ?? null,
      } as AccountSpace
      return [id, normalized]
    }),
  )
  if (!spaces[DEFAULT_SPACE_ID]) spaces[DEFAULT_SPACE_ID] = createSpace(account.id, DEFAULT_SPACE_ID, 'General')
  const spaceOrder = Array.isArray(account.spaceOrder) && account.spaceOrder.length > 0
    ? account.spaceOrder.filter((id) => spaces[id])
    : [DEFAULT_SPACE_ID]
  if (!spaceOrder.includes(DEFAULT_SPACE_ID)) spaceOrder.unshift(DEFAULT_SPACE_ID)
  return {
    ...fallback,
    ...account,
    colorHue: account.colorHue ?? fallback.colorHue,
    avatarDataUrl: account.avatarDataUrl ?? null,
    requirePassword: account.requirePassword ?? false,
    passwordHash: account.passwordHash ?? null,
    partitionId: account.partitionId || fallback.partitionId,
    spaces,
    spaceOrder,
    activeSpaceId: account.activeSpaceId && spaces[account.activeSpaceId] ? account.activeSpaceId : DEFAULT_SPACE_ID,
  }
}

function findTabOwner(accounts: Record<string, BrowserAccount>, tabId: string): { accountId: string; spaceId: string } | null {
  for (const account of Object.values(accounts)) {
    for (const space of Object.values(account.spaces)) {
      if (space.tabIds.includes(tabId)) return { accountId: account.id, spaceId: space.id }
    }
  }
  return null
}

type PersistedAccountState = Pick<AccountStore, 'accounts' | 'accountOrder' | 'activeAccountId'>

export const useAccountStore = create<AccountStore>()(
  devtools(
    persist(
      (set, get) => ({
        accounts: { [DEFAULT_ACCOUNT_ID]: createAccount(DEFAULT_ACCOUNT_ID, 'Personal') },
        accountOrder: [DEFAULT_ACCOUNT_ID],
        activeAccountId: DEFAULT_ACCOUNT_ID,
        unlockedAccountIds: [],

        addAccount: (name) => {
          const id = crypto.randomUUID()
          const account = createAccount(id, name.trim() || 'Account')
          set((s) => ({
            accounts: { ...s.accounts, [id]: account },
            accountOrder: [...s.accountOrder, id],
            activeAccountId: id,
          }), undefined, 'addAccount')
          return id
        },

        renameAccount: (id, name) => {
          set((s) => {
            const account = s.accounts[id]
            if (!account) return s
            return { accounts: { ...s.accounts, [id]: { ...account, name, updatedAt: Date.now() } } }
          }, undefined, 'renameAccount')
        },

        setAccountColor: (id, hue) => {
          set((s) => {
            const account = s.accounts[id]
            if (!account) return s
            return { accounts: { ...s.accounts, [id]: { ...account, colorHue: hue, updatedAt: Date.now() } } }
          }, undefined, 'setAccountColor')
        },

        setAccountAvatar: (id, avatarDataUrl) => {
          set((s) => {
            const account = s.accounts[id]
            if (!account) return s
            return { accounts: { ...s.accounts, [id]: { ...account, avatarDataUrl, updatedAt: Date.now() } } }
          }, undefined, 'setAccountAvatar')
        },

        setAccountPassword: (id, passwordHash) => {
          set((s) => {
            const account = s.accounts[id]
            if (!account || id !== s.activeAccountId) return s
            return { accounts: { ...s.accounts, [id]: { ...account, passwordHash, requirePassword: Boolean(passwordHash), updatedAt: Date.now() } } }
          }, undefined, 'setAccountPassword')
          get().unlockAccount(id)
        },

        setRequirePassword: (id, requirePassword) => {
          set((s) => {
            const account = s.accounts[id]
            if (!account || id !== s.activeAccountId) return s
            return { accounts: { ...s.accounts, [id]: { ...account, requirePassword: requirePassword && Boolean(account.passwordHash), updatedAt: Date.now() } } }
          }, undefined, 'setRequirePassword')
          if (requirePassword) get().unlockAccount(id)
        },

        removeAccount: (id) => {
          if (id === DEFAULT_ACCOUNT_ID) return
          set((s) => {
            if (!s.accounts[id]) return s
            const accounts = { ...s.accounts }
            delete accounts[id]
            const accountOrder = s.accountOrder.filter((accountId) => accountId !== id)
            return {
              accounts,
              accountOrder,
              unlockedAccountIds: s.unlockedAccountIds.filter((accountId) => accountId !== id),
              activeAccountId: s.activeAccountId === id ? DEFAULT_ACCOUNT_ID : s.activeAccountId,
            }
          }, undefined, 'removeAccount')
        },

        unlockAccount: (id) => {
          set((s) => {
            if (!s.accounts[id] || s.unlockedAccountIds.includes(id)) return s
            return { unlockedAccountIds: [...s.unlockedAccountIds, id] }
          }, undefined, 'unlockAccount')
        },

        switchAccount: (id) => {
          const state = get()
          const account = state.accounts[id]
          if (!account) return
          if (id !== state.activeAccountId && account.requirePassword && account.passwordHash && !state.unlockedAccountIds.includes(id)) return
          set({ activeAccountId: id }, undefined, 'switchAccount')
        },

        addSpace: (name, hue) => {
          const id = crypto.randomUUID()
          set((s) => {
            const account = s.accounts[s.activeAccountId]
            if (!account) return s
            const space = createSpace(account.id, id, name.trim() || 'Space', hue)
            return {
              accounts: {
                ...s.accounts,
                [account.id]: {
                  ...account,
                  spaces: { ...account.spaces, [id]: space },
                  spaceOrder: [...account.spaceOrder, id],
                  activeSpaceId: id,
                  updatedAt: Date.now(),
                },
              },
            }
          }, undefined, 'addSpace')
          return id
        },

        renameSpace: (spaceId, name) => {
          set((s) => {
            const account = s.accounts[s.activeAccountId]
            const space = account?.spaces[spaceId]
            if (!account || !space) return s
            return {
              accounts: {
                ...s.accounts,
                [account.id]: {
                  ...account,
                  spaces: { ...account.spaces, [spaceId]: { ...space, name, updatedAt: Date.now() } },
                },
              },
            }
          }, undefined, 'renameSpace')
        },

        setSpaceHue: (spaceId, hue) => {
          set((s) => {
            const account = s.accounts[s.activeAccountId]
            const space = account?.spaces[spaceId]
            if (!account || !space) return s
            return {
              accounts: {
                ...s.accounts,
                [account.id]: {
                  ...account,
                  spaces: { ...account.spaces, [spaceId]: { ...space, hue, updatedAt: Date.now() } },
                },
              },
            }
          }, undefined, 'setSpaceHue')
        },

        removeSpace: (spaceId) => {
          if (spaceId === DEFAULT_SPACE_ID) return
          set((s) => {
            const account = s.accounts[s.activeAccountId]
            const space = account?.spaces[spaceId]
            const general = account?.spaces[DEFAULT_SPACE_ID]
            if (!account || !space || !general) return s
            const spaces: Record<string, AccountSpace> = { ...account.spaces, [DEFAULT_SPACE_ID]: { ...general, tabIds: [...general.tabIds, ...space.tabIds] } }
            delete spaces[spaceId]
            return {
              accounts: {
                ...s.accounts,
                [account.id]: {
                  ...account,
                  spaces,
                  spaceOrder: account.spaceOrder.filter((id) => id !== spaceId),
                  activeSpaceId: account.activeSpaceId === spaceId ? DEFAULT_SPACE_ID : account.activeSpaceId,
                  updatedAt: Date.now(),
                },
              },
            }
          }, undefined, 'removeSpace')
        },

        switchSpace: (spaceId) => {
          set((s) => {
            const account = s.accounts[s.activeAccountId]
            if (!account?.spaces[spaceId]) return s
            return {
              accounts: {
                ...s.accounts,
                [account.id]: { ...account, activeSpaceId: spaceId, updatedAt: Date.now() },
              },
            }
          }, undefined, 'switchSpace')
        },

        assignTabToActiveSpace: (tabId) => {
          set((s) => {
            if (findTabOwner(s.accounts, tabId)) return s
            const account = s.accounts[s.activeAccountId]
            const space = account?.spaces[account.activeSpaceId]
            if (!account || !space) return s
            return {
              accounts: {
                ...s.accounts,
                [account.id]: {
                  ...account,
                  spaces: { ...account.spaces, [space.id]: { ...space, tabIds: [...space.tabIds, tabId], activeTabId: tabId } },
                },
              },
            }
          }, undefined, 'assignTabToActiveSpace')
        },

        moveTabToSpace: (tabId, targetSpaceId) => {
          set((s) => {
            const account = s.accounts[s.activeAccountId]
            const target = account?.spaces[targetSpaceId]
            if (!account || !target) return s
            const spaces = Object.fromEntries(
              Object.entries(account.spaces).map(([id, space]) => [
                id,
                {
                  ...space,
                  tabIds: id === targetSpaceId
                    ? Array.from(new Set([...space.tabIds, tabId]))
                    : space.tabIds.filter((candidate) => candidate !== tabId),
                  activeTabId: space.activeTabId === tabId && id !== targetSpaceId ? null : space.activeTabId,
                },
              ]),
            ) as Record<string, AccountSpace>
            return {
              accounts: {
                ...s.accounts,
                [account.id]: { ...account, spaces, updatedAt: Date.now() },
              },
            }
          }, undefined, 'moveTabToSpace')
        },

        removeTabRefs: (tabId) => {
          set((s) => {
            let changed = false
            const accounts = Object.fromEntries(Object.entries(s.accounts).map(([accountId, account]) => {
              const spaces = Object.fromEntries(Object.entries(account.spaces).map(([spaceId, space]) => {
                if (!space.tabIds.includes(tabId) && space.activeTabId !== tabId) return [spaceId, space]
                changed = true
                return [spaceId, { ...space, tabIds: space.tabIds.filter((id) => id !== tabId), activeTabId: space.activeTabId === tabId ? null : space.activeTabId }]
              })) as Record<string, AccountSpace>
              return [accountId, { ...account, spaces }]
            })) as Record<string, BrowserAccount>
            return changed ? { accounts } : s
          }, undefined, 'removeTabRefs')
        },

        setActiveTabForCurrentSpace: (tabId) => {
          set((s) => {
            const account = s.accounts[s.activeAccountId]
            const space = account?.spaces[account.activeSpaceId]
            if (!account || !space) return s
            return {
              accounts: {
                ...s.accounts,
                [account.id]: {
                  ...account,
                  spaces: { ...account.spaces, [space.id]: { ...space, activeTabId: tabId } },
                },
              },
            }
          }, undefined, 'setActiveTabForCurrentSpace')
        },
      }),
      {
        name: 'account-store',
        version: 1,
        storage: createIPCStorage<PersistedAccountState>({
          onParseError(name) {
            logger.error(`[accountStore] Corrupted persisted data for '${name}' detected; using default account`)
          },
        }),
        partialize: (state): PersistedAccountState => ({
          accounts: state.accounts,
          accountOrder: state.accountOrder,
          activeAccountId: state.activeAccountId,
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return
          if (!state.accounts[DEFAULT_ACCOUNT_ID]) state.accounts[DEFAULT_ACCOUNT_ID] = createAccount(DEFAULT_ACCOUNT_ID, 'Personal')
          state.accounts = Object.fromEntries(Object.entries(state.accounts).map(([id, account]) => [id, normalizeAccount({ ...account, id })]))
          state.accountOrder = state.accountOrder.filter((id) => state.accounts[id])
          if (state.accountOrder.length === 0) state.accountOrder = [DEFAULT_ACCOUNT_ID]
          if (!state.accounts[state.activeAccountId]) state.activeAccountId = DEFAULT_ACCOUNT_ID
        },
      },
    ),
    { name: 'AccountStore', enabled: import.meta.env.DEV },
  ),
)

export function getActiveAccount(): BrowserAccount {
  const state = useAccountStore.getState()
  return state.accounts[state.activeAccountId] ?? state.accounts[DEFAULT_ACCOUNT_ID]!
}

export function getPartitionForAccount(accountId?: string, isPrivate = false): string {
  if (isPrivate) return 'private'
  const state = useAccountStore.getState()
  return state.accounts[accountId || state.activeAccountId]?.partitionId ?? 'persist:default'
}

void (async () => {
  if (typeof window === 'undefined') return
  try {
    const state = useAccountStore.getState()
    const defaultAccount = state.accounts[DEFAULT_ACCOUNT_ID]
    if (!defaultAccount || defaultAccount.spaceOrder.length > 1 || defaultAccount.spaces[DEFAULT_SPACE_ID]?.tabIds.length) return
    const raw = await window.electronAPI.loadStore('space-store')
    if (!raw) return
    const parsed = JSON.parse(raw) as { state?: { spaces?: Record<string, Partial<AccountSpace> & { name?: string }>; spaceOrder?: string[]; activeSpaceId?: string } } | null
    const legacy = parsed?.state
    if (!legacy?.spaces || !legacy.spaceOrder?.length) return
    const spaces = Object.fromEntries(
      legacy.spaceOrder
        .filter((id) => legacy.spaces?.[id])
        .map((id) => {
          const source = legacy.spaces![id]!
          return [id, {
            ...createSpace(DEFAULT_ACCOUNT_ID, id, source.name || (id === DEFAULT_SPACE_ID ? 'General' : 'Space'), source.hue ?? -1),
            ...source,
            id,
            accountId: DEFAULT_ACCOUNT_ID,
            tabIds: Array.isArray(source.tabIds) ? source.tabIds : [],
            activeTabId: source.activeTabId ?? null,
          } satisfies AccountSpace]
        }),
    )
    if (!spaces[DEFAULT_SPACE_ID]) spaces[DEFAULT_SPACE_ID] = createSpace(DEFAULT_ACCOUNT_ID, DEFAULT_SPACE_ID, 'General')
    useAccountStore.setState((s) => ({
      accounts: {
        ...s.accounts,
        [DEFAULT_ACCOUNT_ID]: {
          ...s.accounts[DEFAULT_ACCOUNT_ID]!,
          spaces,
          spaceOrder: legacy.spaceOrder!.filter((id) => spaces[id]),
          activeSpaceId: legacy.activeSpaceId && spaces[legacy.activeSpaceId] ? legacy.activeSpaceId : DEFAULT_SPACE_ID,
        },
      },
    }))
  } catch (error) {
    logger.warn('[accountStore] Legacy space migration skipped:', error)
  }
})()
