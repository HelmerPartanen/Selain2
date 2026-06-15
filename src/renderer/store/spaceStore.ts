// ─── Space Store ──────────────────────────────────────────────────────────────
// Manages browser Spaces — logical groupings of tabs with optional color tints.
// Each space owns a set of tab IDs and remembers its last-active tab.
// Stays in sync with tabStore via reactive subscriber (no tabStore changes needed).

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { createIPCStorage } from './ipcStorage'
import { logger } from '@/utils/logger'
import { useTabStore } from './tabStore'
import type { PrivacyProfile } from './settingsStore'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Space {
  id: string
  name: string
  /** HSL hue for the space tint. -1 = no tint (default). */
  hue: number
  /** Ordered tab IDs belonging to this space */
  tabIds: string[]
  /** Last active tab in this space (restored on switch) */
  activeTabId: string | null
  pinnedUrls: string[]
  restoreMode: 'restore' | 'sleep' | 'blank'
  privacyProfile: PrivacyProfile
  createdAt: number
  updatedAt: number
}

export interface SpaceStore {
  spaces: Record<string, Space>
  spaceOrder: string[]
  activeSpaceId: string

  addSpace: (name: string, hue: number) => string
  removeSpace: (id: string) => void
  renameSpace: (id: string, name: string) => void
  setSpaceHue: (id: string, hue: number) => void
  switchSpace: (id: string) => void
  moveTabToSpace: (tabId: string, targetSpaceId: string) => void
  setSpaceRestoreMode: (id: string, mode: Space['restoreMode']) => void
  setSpacePrivacyProfile: (id: string, profile: PrivacyProfile) => void

  /** @internal — called by tab-sync subscriber */
  _syncNewTab: (tabId: string) => void
  /** @internal — called by tab-sync subscriber */
  _syncRemovedTab: (tabId: string) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const DEFAULT_SPACE_ID = 'general'

/** Preset hue options for space color picker */
export const SPACE_PRESET_HUES = [
  { label: 'None', hue: -1 },
  { label: 'Sage', hue: 145 },
  { label: 'Ocean', hue: 210 },
  { label: 'Sunset', hue: 25 },
  { label: 'Berry', hue: 280 },
  { label: 'Rose', hue: 340 },
  { label: 'Amber', hue: 42 },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createDefaultSpace(): Space {
  const now = Date.now()
  return {
    id: DEFAULT_SPACE_ID,
    name: 'General',
    hue: -1,
    tabIds: [],
    activeTabId: null,
    pinnedUrls: [],
    restoreMode: 'restore',
    privacyProfile: 'standard',
    createdAt: now,
    updatedAt: now,
  }
}

function normalizeSpace(space: Partial<Space> & Pick<Space, 'id' | 'name'>): Space {
  const now = Date.now()
  return {
    id: space.id,
    name: space.name,
    hue: space.hue ?? -1,
    tabIds: Array.isArray(space.tabIds) ? space.tabIds : [],
    activeTabId: space.activeTabId ?? null,
    pinnedUrls: Array.isArray(space.pinnedUrls) ? space.pinnedUrls : [],
    restoreMode: space.restoreMode ?? 'restore',
    privacyProfile: space.privacyProfile ?? 'standard',
    createdAt: space.createdAt ?? now,
    updatedAt: space.updatedAt ?? now,
  }
}

/** Find which space owns a tab */
function findOwnerSpace(spaces: Record<string, Space>, tabId: string): string | null {
  for (const [sid, space] of Object.entries(spaces)) {
    if (space.tabIds.includes(tabId)) return sid
  }
  return null
}

// ─── Partialize type (persistence) ───────────────────────────────────────────

type PersistedSpaceState = Pick<SpaceStore, 'spaces' | 'spaceOrder' | 'activeSpaceId'>

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSpaceStore = create<SpaceStore>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        spaces: { [DEFAULT_SPACE_ID]: createDefaultSpace() } as Record<string, Space>,
        spaceOrder: [DEFAULT_SPACE_ID],
        activeSpaceId: DEFAULT_SPACE_ID,

        // ── Create a new space ──────────────────────────────────────────────

        addSpace: (name, hue) => {
          const id = crypto.randomUUID()
          const now = Date.now()
          const space: Space = {
            id,
            name,
            hue,
            tabIds: [],
            activeTabId: null,
            pinnedUrls: [],
            restoreMode: 'restore',
            privacyProfile: 'standard',
            createdAt: now,
            updatedAt: now,
          }
          set(
            (s) => ({
              spaces: { ...s.spaces, [id]: space },
              spaceOrder: [...s.spaceOrder, id],
            }),
            undefined,
            'addSpace'
          )
          return id
        },

        // ── Delete a space (tabs migrate to General) ────────────────────────

        removeSpace: (id) => {
          if (id === DEFAULT_SPACE_ID) return
          const state = get()
          const space = state.spaces[id]
          if (!space) return

          const general = state.spaces[DEFAULT_SPACE_ID]!
          const newGeneral: Space = {
            ...general,
            tabIds: [...general.tabIds, ...space.tabIds],
            pinnedUrls: [...new Set([...general.pinnedUrls, ...space.pinnedUrls])],
          }

          const newSpaces: Record<string, Space> = { ...state.spaces, [DEFAULT_SPACE_ID]: newGeneral }
          delete newSpaces[id]

          const wasActive = state.activeSpaceId === id
          set(
            {
              spaces: newSpaces,
              spaceOrder: state.spaceOrder.filter((sid) => sid !== id),
              activeSpaceId: wasActive ? DEFAULT_SPACE_ID : state.activeSpaceId,
            },
            undefined,
            'removeSpace'
          )

          // Switch to General's active tab if we deleted the active space
          if (wasActive) {
            const tabStore = useTabStore.getState()
            const target = newGeneral.activeTabId ?? newGeneral.tabIds[0]
            if (target && tabStore.tabs[target]) {
              tabStore.setActiveTab(target)
            }
          }
        },

        // ── Rename ──────────────────────────────────────────────────────────

        renameSpace: (id, name) => {
          set(
            (s) => {
              const space = s.spaces[id]
              if (!space) return s
              return { spaces: { ...s.spaces, [id]: { ...space, name, updatedAt: Date.now() } } }
            },
            undefined,
            'renameSpace'
          )
        },

        // ── Recolor ─────────────────────────────────────────────────────────

        setSpaceHue: (id, hue) => {
          set(
            (s) => {
              const space = s.spaces[id]
              if (!space) return s
              return { spaces: { ...s.spaces, [id]: { ...space, hue, updatedAt: Date.now() } } }
            },
            undefined,
            'setSpaceHue'
          )
        },

        // ── Switch active space ─────────────────────────────────────────────

        switchSpace: (id) => {
          const state = get()
          if (state.activeSpaceId === id) return
          const targetSpace = state.spaces[id]
          if (!targetSpace) return

          // Snapshot current active tab into outgoing space
          const currentTabId = useTabStore.getState().activeTabId
          const currentSpace = state.spaces[state.activeSpaceId]
          const newSpaces = { ...state.spaces }
          if (currentSpace) {
            newSpaces[state.activeSpaceId] = {
              ...currentSpace,
              activeTabId: currentTabId,
            }
          }

          set({ spaces: newSpaces, activeSpaceId: id }, undefined, 'switchSpace')

          // Clear split view (split is space-local)
          const tabStore = useTabStore.getState()
          if (tabStore.splitTabId) tabStore.unsplit()

          // Restore the target space's last active tab
          if (targetSpace.activeTabId && tabStore.tabs[targetSpace.activeTabId]) {
            tabStore.setActiveTab(targetSpace.activeTabId)
          } else if (targetSpace.tabIds.length > 0) {
            const first = targetSpace.tabIds.find((tid) => tabStore.tabs[tid])
            if (first) {
              tabStore.setActiveTab(first)
            } else {
              tabStore.addTab()
            }
          } else {
            // Empty space — open a new tab
            tabStore.addTab()
          }
        },

        // ── Move tab between spaces ─────────────────────────────────────────

        moveTabToSpace: (tabId, targetSpaceId) => {
          const state = get()
          const target = state.spaces[targetSpaceId]
          if (!target) return

          const sourceId = findOwnerSpace(state.spaces, tabId)
          if (!sourceId || sourceId === targetSpaceId) return

          const source = state.spaces[sourceId]!
          const newSourceTabIds = source.tabIds.filter((t) => t !== tabId)

          const newSpaces = {
            ...state.spaces,
            [sourceId]: { ...source, tabIds: newSourceTabIds, updatedAt: Date.now() },
            [targetSpaceId]: { ...target, tabIds: [...target.tabIds, tabId], updatedAt: Date.now() },
          }

          set({ spaces: newSpaces }, undefined, 'moveTabToSpace')

          // If we moved the current active tab out of the active space, switch tabs
          const tabStore = useTabStore.getState()
          if (sourceId === state.activeSpaceId && tabStore.activeTabId === tabId) {
            if (newSourceTabIds.length > 0) {
              const next = newSourceTabIds.find((tid) => tabStore.tabs[tid])
              if (next) tabStore.setActiveTab(next)
              else tabStore.addTab()
            } else {
              tabStore.addTab()
            }
          }
        },

        // ── Internal sync helpers ────────────────────────────────────────────

        setSpaceRestoreMode: (id, mode) => {
          set(
            (s) => {
              const space = s.spaces[id]
              if (!space) return s
              return { spaces: { ...s.spaces, [id]: { ...space, restoreMode: mode, updatedAt: Date.now() } } }
            },
            undefined,
            'setSpaceRestoreMode'
          )
        },

        setSpacePrivacyProfile: (id, profile) => {
          set(
            (s) => {
              const space = s.spaces[id]
              if (!space) return s
              return { spaces: { ...s.spaces, [id]: { ...space, privacyProfile: profile, updatedAt: Date.now() } } }
            },
            undefined,
            'setSpacePrivacyProfile'
          )
        },

        _syncNewTab: (tabId) => {
          const state = get()
          // Already assigned?
          if (findOwnerSpace(state.spaces, tabId) !== null) return

          const active = state.spaces[state.activeSpaceId]
          if (!active) return

          set(
            (s) => ({
              spaces: {
                ...s.spaces,
                [s.activeSpaceId]: {
                  ...s.spaces[s.activeSpaceId]!,
                  tabIds: [...s.spaces[s.activeSpaceId]!.tabIds, tabId],
                },
              },
            }),
            undefined,
            '_syncNewTab'
          )
        },

        _syncRemovedTab: (tabId) => {
          set(
            (s) => {
              let changed = false
              const newSpaces: Record<string, Space> = {}
              for (const [sid, space] of Object.entries(s.spaces)) {
                if (space.tabIds.includes(tabId)) {
                  changed = true
                  newSpaces[sid] = {
                    ...space,
                    tabIds: space.tabIds.filter((t) => t !== tabId),
                    activeTabId: space.activeTabId === tabId ? null : space.activeTabId,
                  }
                } else {
                  newSpaces[sid] = space
                }
              }
              return changed ? { spaces: newSpaces } : s
            },
            undefined,
            '_syncRemovedTab'
          )
        },
      })),
      {
        name: 'space-store',
        version: 1,
        storage: createIPCStorage<PersistedSpaceState>({
          onParseError(name) {
            logger.error(`[spaceStore] Corrupted persisted data for '${name}' detected; starting with default space`)
          }
        }),
        partialize: (state): PersistedSpaceState => ({
          spaces: state.spaces,
          spaceOrder: state.spaceOrder,
          activeSpaceId: state.activeSpaceId,
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return
          // Ensure the default space always exists
          if (!state.spaces[DEFAULT_SPACE_ID]) {
            state.spaces[DEFAULT_SPACE_ID] = createDefaultSpace()
            if (!state.spaceOrder.includes(DEFAULT_SPACE_ID)) {
              state.spaceOrder.unshift(DEFAULT_SPACE_ID)
            }
          }
          if (!state.spaces[state.activeSpaceId]) {
            state.activeSpaceId = DEFAULT_SPACE_ID
          }
          for (const [id, space] of Object.entries(state.spaces)) {
            state.spaces[id] = normalizeSpace(space)
          }
        },
      }
    ),
    { name: 'SpaceStore', enabled: import.meta.env.DEV }
  )
)

// ─── Tab Sync Subscriber ─────────────────────────────────────────────────────
// Watches tabStore.tabOrder for additions/removals and keeps space assignments
// in sync automatically — no changes to tabStore internals needed.

let prevTabOrder: string[] = []

function syncTabOrder(tabOrder: string[]): void {
  const store = useSpaceStore.getState()

  const prevSet = new Set(prevTabOrder)
  for (const id of tabOrder) {
    if (!prevSet.has(id)) store._syncNewTab(id)
  }

  const newSet = new Set(tabOrder)
  for (const id of prevTabOrder) {
    if (!newSet.has(id)) store._syncRemovedTab(id)
  }

  prevTabOrder = tabOrder
}

// Subscribe once tabStore is available
useTabStore.subscribe((s) => s.tabOrder, syncTabOrder)

// Initial sync — assign any orphaned tabs to the active space
function initialSync(): void {
  const tabOrder = useTabStore.getState().tabOrder
  const spaces = useSpaceStore.getState().spaces

  const assigned = new Set<string>()
  for (const space of Object.values(spaces)) {
    for (const tid of space.tabIds) assigned.add(tid)
  }

  for (const tid of tabOrder) {
    if (!assigned.has(tid)) useSpaceStore.getState()._syncNewTab(tid)
  }

  prevTabOrder = tabOrder
}

// Run initial sync after both stores have hydrated
if (useTabStore.persist.hasHydrated() && useSpaceStore.persist.hasHydrated()) {
  initialSync()
} else {
  let tabHydrated = useTabStore.persist.hasHydrated()
  let spaceHydrated = useSpaceStore.persist.hasHydrated()

  const trySync = (): void => {
    if (tabHydrated && spaceHydrated) {
      initialSync()
      unsub1()
      unsub2()
    }
  }

  const unsub1 = useTabStore.persist.onFinishHydration(() => {
    tabHydrated = true
    trySync()
  })
  const unsub2 = useSpaceStore.persist.onFinishHydration(() => {
    spaceHydrated = true
    trySync()
  })
}
