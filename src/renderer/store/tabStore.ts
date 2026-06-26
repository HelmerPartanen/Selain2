import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { useSettingsStore } from './settingsStore'
import { createIPCStorage } from './ipcStorage'
import { webviewRegistry } from '@/webview/webviewRegistry'

export interface Tab {
  id: string
  url: string
  title: string
  favicon: string
  isLoading: boolean
  isPlayingMedia: boolean
  isMuted: boolean
  canGoBack: boolean
  canGoForward: boolean
  isSuspended: boolean
  loadProgress: number
  /** URL to navigate to when webview has no back history (e.g. browser://newtab) */
  virtualBackUrl: string | null
  /** URL to navigate forward to when on a special page */
  virtualForwardUrl: string | null
  /** Cached base64 thumbnail generated just before the tab went to the background */
  thumbnail: string | null
  createdAt: number
  lastActiveAt: number
  pinned: boolean
  sleepReason?: 'manual' | 'memory' | 'cleanup'
}

export type FocusedPanel = 'primary' | 'split'

export interface ClosedTab {
  url: string
  title: string
  favicon: string
}

export interface TabStore {
  tabs: Record<string, Tab>
  tabOrder: string[]
  activeTabId: string | null

  // Split view
  splitTabId: string | null
  focusedPanel: FocusedPanel

  // Recently closed stack
  recentlyClosed: ClosedTab[]

  addTab: (url?: string) => string
  duplicateTab: (id: string) => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTab: (id: string, patch: Partial<Omit<Tab, 'id'>>) => void
  reorderTab: (fromIndex: number, toIndex: number) => void
  suspendTab: (id: string, reason?: 'manual' | 'memory' | 'cleanup') => void
  togglePinned: (id: string) => void
  toggleMute: (id: string) => void

  // Split view actions
  splitTab: (tabId: string) => void
  unsplit: () => void
  setFocusedPanel: (panel: FocusedPanel) => void
  swapSplitPanels: () => void

  // Reopen closed tab
  reopenLastClosed: () => void
  reopenClosedAt: (index: number) => void
}

/** Shape persisted to disk — a subset of TabStore without action methods */
type PersistedTabState = Pick<TabStore, 'tabOrder' | 'activeTabId' | 'splitTabId' | 'focusedPanel' | 'recentlyClosed'> & {
  tabs: Record<string, Omit<Tab, 'isPlayingMedia' | 'isMuted' | 'virtualBackUrl' | 'virtualForwardUrl' | 'thumbnail'>>
}

const SESSION_RESTORE_FAILED_EVENT = 'session-restore-failed'
export function dispatchSessionRestoreFailed(): void {
  window.dispatchEvent(new CustomEvent(SESSION_RESTORE_FAILED_EVENT))
}
export function onSessionRestoreFailed(handler: () => void): () => void {
  const fn = () => handler()
  window.addEventListener(SESSION_RESTORE_FAILED_EVENT, fn)
  return () => window.removeEventListener(SESSION_RESTORE_FAILED_EVENT, fn)
}

function isSpecialPage(url: string): boolean {
  return url === 'browser://newtab' || url === 'browser://uikit'
}

function createTab(url: string): Tab {
  const now = Date.now()
  const title = url === 'browser://uikit' ? 'UI Kit' : 'New Tab'
  return {
    id: crypto.randomUUID(),
    url,
    title,
    favicon: '',
    isLoading: false,
    isPlayingMedia: false,
    isMuted: false,
    canGoBack: false,
    canGoForward: false,
    isSuspended: false,
    loadProgress: 0,
    virtualBackUrl: null,
    virtualForwardUrl: null,
    thumbnail: null,
    createdAt: now,
    lastActiveAt: now,
    pinned: false
  }
}

const MAX_RECENTLY_CLOSED = 10

function getDomainKey(url: string): string | null {
  try {
    const { hostname } = new URL(url)
    return hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export const useTabStore = create<TabStore>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        tabs: {},
        tabOrder: [],
        activeTabId: null,
        splitTabId: null,
        focusedPanel: 'primary' as FocusedPanel,
        recentlyClosed: [],

        addTab: (url = 'browser://newtab') => {
          const tab = createTab(url)
          set(
            (state) => {
              const nextOrder = [...state.tabOrder]
              const activeIndex = state.activeTabId ? nextOrder.indexOf(state.activeTabId) : -1
              const insertIndex = activeIndex >= 0 ? activeIndex + 1 : nextOrder.length
              nextOrder.splice(insertIndex, 0, tab.id)
              return {
                tabs: { ...state.tabs, [tab.id]: tab },
                tabOrder: nextOrder,
                activeTabId: tab.id
              }
            },
            undefined,
            'addTab'
          )
          return tab.id
        },

        duplicateTab: (id) => {
          const source = get().tabs[id]
          if (!source) return
          const tab = createTab(source.url)
          tab.title = source.title
          tab.favicon = source.favicon
          set(
            (state) => {
              const nextOrder = [...state.tabOrder]
              const sourceIndex = nextOrder.indexOf(id)
              const insertIndex = sourceIndex >= 0 ? sourceIndex + 1 : nextOrder.length
              nextOrder.splice(insertIndex, 0, tab.id)
              return {
                tabs: { ...state.tabs, [tab.id]: tab },
                tabOrder: nextOrder,
                activeTabId: tab.id
              }
            },
            undefined,
            'duplicateTab'
          )
        },

        removeTab: (id) => {
          const state = get()
          const index = state.tabOrder.indexOf(id)
          if (index === -1) return

          const closedTab = state.tabs[id]
          if (closedTab?.pinned && state.tabOrder.length > 1) return

          // If it's the only tab...
          if (state.tabOrder.length === 1) {
            // ...and already on newtab, don't allow closing
            if (closedTab && closedTab.url === 'browser://newtab') return
            // ...otherwise navigate it to newtab instead of removing
            if (closedTab) {
              // Push to recently closed
              let newRecentlyClosed = state.recentlyClosed
              if (closedTab.url !== 'browser://newtab') {
                newRecentlyClosed = [
                  { url: closedTab.url, title: closedTab.title, favicon: closedTab.favicon },
                  ...state.recentlyClosed
                ].slice(0, MAX_RECENTLY_CLOSED)
              }
              set(
                {
                  tabs: {
                    ...state.tabs,
                    [id]: {
                      ...closedTab,
                      url: 'browser://newtab',
                      title: 'New Tab',
                      favicon: '',
                      isLoading: false,
                      canGoBack: false,
                      canGoForward: false,
                      loadProgress: 0,
                      virtualBackUrl: null,
                      virtualForwardUrl: null,
                      thumbnail: null
                    }
                  },
                  recentlyClosed: newRecentlyClosed
                },
                undefined,
                'removeTab/navigateToNewTab'
              )
            }
            return
          }

          // Push to recently closed
          let newRecentlyClosed = state.recentlyClosed
          if (closedTab && closedTab.url !== 'browser://newtab') {
            newRecentlyClosed = [
              { url: closedTab.url, title: closedTab.title, favicon: closedTab.favicon },
              ...state.recentlyClosed
            ].slice(0, MAX_RECENTLY_CLOSED)
          }

          const newOrder = state.tabOrder.filter((tid) => tid !== id)
          const newTabs = { ...state.tabs }
          delete newTabs[id]

          let newActiveId = state.activeTabId
          let newSplitId = state.splitTabId
          let newFocusedPanel = state.focusedPanel

          // Handle removing the split tab
          if (state.splitTabId === id) {
            newSplitId = null
            newFocusedPanel = 'primary'
          }

          // Handle removing the active tab
          if (state.activeTabId === id) {
            if (newOrder.length === 0) {
              newActiveId = null
            } else if (index >= newOrder.length) {
              newActiveId = newOrder[newOrder.length - 1] ?? null
            } else {
              newActiveId = newOrder[index] ?? null
            }
            // If we now point to the split tab, unsplit
            if (newActiveId === newSplitId) {
              newSplitId = null
              newFocusedPanel = 'primary'
            }
          }

          set(
            {
              tabs: newTabs,
              tabOrder: newOrder,
              activeTabId: newActiveId,
              splitTabId: newSplitId,
              focusedPanel: newFocusedPanel,
              recentlyClosed: newRecentlyClosed
            },
            undefined,
            'removeTab'
          )

          if (newOrder.length === 0) {
            get().addTab()
          }
        },

        setActiveTab: (id) => {
          const state = get()
          if (state.tabs[id] === undefined) return
          if (state.activeTabId === id) return

          const tab = state.tabs[id]
          const patch: Partial<TabStore> = { activeTabId: id, focusedPanel: 'primary' }

          // If this tab was the split tab, swap
          if (state.splitTabId === id) {
            patch.splitTabId = state.activeTabId
            patch.focusedPanel = 'primary'
          }

          if (tab && tab.isSuspended) {
            set(
              (s) => ({
                ...patch,
                tabs: {
                  ...s.tabs,
                  [id]: { ...tab, isSuspended: false, sleepReason: undefined, lastActiveAt: Date.now() }
                }
              }),
              undefined,
              'setActiveTab/restore'
            )
          } else {
            set(
              (s) => ({
                ...patch,
                tabs: { ...s.tabs, [id]: { ...tab, lastActiveAt: Date.now() } }
              }),
              undefined,
              'setActiveTab'
            )
          }
        },

        updateTab: (id, patch) => {
          set(
            (state) => {
              const existing = state.tabs[id]
              if (!existing) return state

              // Auto-detect transitions between special pages and real pages
              let virtualPatch: Partial<Tab> = {}
              if (patch.url && patch.url !== existing.url && !('virtualBackUrl' in patch)) {
                const wasSpecial = isSpecialPage(existing.url)
                const nowSpecial = isSpecialPage(patch.url)
                if (wasSpecial && !nowSpecial) {
                  // Navigating from special page (e.g. newtab) to a real URL
                  virtualPatch = { virtualBackUrl: existing.url, virtualForwardUrl: null }
                }
              }

              const merged = { ...existing, ...virtualPatch, ...patch }
              const keys = Object.keys({ ...patch, ...virtualPatch }) as Array<keyof Tab>
              const existingAny = existing as unknown as Record<string, unknown>
              const changed = keys.some((k) => existingAny[k] !== merged[k])
              if (!changed) return state

              let nextOrder = state.tabOrder

              // Optional domain-based grouping for real pages
              if (patch.url && !isSpecialPage(patch.url) && useSettingsStore.getState().autoGroupTabsByDomain) {
                const domain = getDomainKey(patch.url)
                if (domain) {
                  const currentIndex = nextOrder.indexOf(id)
                  if (currentIndex !== -1) {
                    let targetIndex = -1
                    for (let i = 0; i < nextOrder.length; i++) {
                      const otherId = nextOrder[i]!
                      if (otherId === id) continue
                      const other = state.tabs[otherId]
                      if (!other || isSpecialPage(other.url)) continue
                      if (getDomainKey(other.url) === domain) {
                        targetIndex = i
                        break
                      }
                    }
                    if (targetIndex !== -1 && targetIndex !== currentIndex) {
                      const reordered = [...nextOrder]
                      reordered.splice(currentIndex, 1)
                      const insertAt = targetIndex < currentIndex ? targetIndex + 1 : targetIndex
                      reordered.splice(insertAt, 0, id)
                      nextOrder = reordered
                    }
                  }
                }
              }

              return {
                tabs: { ...state.tabs, [id]: merged },
                tabOrder: nextOrder
              }
            },
            undefined,
            'updateTab'
          )
        },

        reorderTab: (fromIndex, toIndex) => {
          set(
            (state) => {
              const newOrder = [...state.tabOrder]
              const [moved] = newOrder.splice(fromIndex, 1)
              if (moved === undefined) return state
              newOrder.splice(toIndex, 0, moved)
              return { tabOrder: newOrder }
            },
            undefined,
            'reorderTab'
          )
        },

        suspendTab: (id, reason = 'manual') => {
          set(
            (state) => {
              const tab = state.tabs[id]
              if (!tab || tab.isSuspended) return state
              return {
                tabs: {
                  ...state.tabs,
                  [id]: { ...tab, isSuspended: true, sleepReason: reason }
                }
              }
            },
            undefined,
            'suspendTab'
          )
        },

        togglePinned: (id) => {
          set(
            (state) => {
              const tab = state.tabs[id]
              if (!tab) return state
              return { tabs: { ...state.tabs, [id]: { ...tab, pinned: !tab.pinned } } }
            },
            undefined,
            'togglePinned'
          )
        },

        toggleMute: (id) => {
          const tab = get().tabs[id]
          if (!tab) return
          const newMuted = !tab.isMuted
          set(
            (state) => {
              const t = state.tabs[id]
              if (!t) return state
              return { tabs: { ...state.tabs, [id]: { ...t, isMuted: newMuted } } }
            },
            undefined,
            'toggleMute'
          )
          // Apply to webview directly — setAudioMuted is a DOM-level API
          const webview = webviewRegistry.get(id)
          if (webview) (webview as unknown as { setAudioMuted(m: boolean): void }).setAudioMuted(newMuted)
        },

        // ─── Split View ────────────────────────────────────

        splitTab: (tabId) => {
          const state = get()
          if (!state.activeTabId || tabId === state.activeTabId) return
          const tab = state.tabs[tabId]
          if (!tab) return

          const patch: Partial<TabStore> = {
            splitTabId: tabId,
            focusedPanel: 'split'
          }
          // Unsuspend if needed
          if (tab.isSuspended) {
            set(
              (s) => ({
                ...patch,
                tabs: { ...s.tabs, [tabId]: { ...tab, isSuspended: false } }
              }),
              undefined,
              'splitTab/restore'
            )
          } else {
            set(patch, undefined, 'splitTab')
          }
        },

        unsplit: () => {
          set(
            { splitTabId: null, focusedPanel: 'primary' },
            undefined,
            'unsplit'
          )
        },

        setFocusedPanel: (panel) => {
          const state = get()
          if (state.focusedPanel === panel) return
          if (panel === 'split' && !state.splitTabId) return
          set({ focusedPanel: panel }, undefined, 'setFocusedPanel')
        },

        swapSplitPanels: () => {
          const state = get()
          if (!state.splitTabId || !state.activeTabId) return
          set(
            {
              activeTabId: state.splitTabId,
              splitTabId: state.activeTabId,
              focusedPanel: state.focusedPanel === 'primary' ? 'split' : 'primary'
            },
            undefined,
            'swapSplitPanels'
          )
        },

        // ─── Reopen Closed ─────────────────────────────────

        reopenLastClosed: () => {
          const state = get()
          if (state.recentlyClosed.length === 0) return
          const [last, ...rest] = state.recentlyClosed
          set({ recentlyClosed: rest }, undefined, 'reopenLastClosed')
          get().addTab(last!.url)
        },

        reopenClosedAt: (index: number) => {
          const state = get()
          const entry = state.recentlyClosed[index]
          if (!entry) return
          const newRecentlyClosed = state.recentlyClosed.filter((_, i) => i !== index)
          set({ recentlyClosed: newRecentlyClosed }, undefined, 'reopenClosedAt')
          get().addTab(entry.url)
        }
      })),
      {
        name: 'tab-session',
        version: 2,
        storage: createIPCStorage<PersistedTabState>({
          onParseError(name) {
            if (name === 'tab-session') dispatchSessionRestoreFailed()
          }
        }),
        partialize: (state): PersistedTabState => ({
          tabOrder: state.tabOrder,
          activeTabId: state.activeTabId,
          splitTabId: state.splitTabId,
          focusedPanel: state.focusedPanel,
          recentlyClosed: state.recentlyClosed.slice(0, MAX_RECENTLY_CLOSED),
          tabs: Object.fromEntries(
            Object.entries(state.tabs).map(([id, tab]) => [
              id,
              {
                id: tab.id,
                url: tab.url,
                title: tab.title,
                favicon: tab.favicon,
                isLoading: false,
                isPlayingMedia: false,
                isMuted: false,
                canGoBack: false,
                canGoForward: false,
                isSuspended: true, // All restored tabs start suspended
                loadProgress: 0,
                createdAt: tab.createdAt ?? Date.now(),
                lastActiveAt: tab.lastActiveAt ?? Date.now(),
                pinned: tab.pinned ?? false,
                sleepReason: tab.sleepReason
              }
            ])
          )
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return
          // Migrate: recentlyClosed added in v2
          state.recentlyClosed = Array.isArray(state.recentlyClosed)
            ? state.recentlyClosed.slice(0, MAX_RECENTLY_CLOSED)
            : []
          for (const tab of Object.values(state.tabs)) {
            tab.createdAt = tab.createdAt ?? Date.now()
            tab.lastActiveAt = tab.lastActiveAt ?? tab.createdAt
            tab.pinned = tab.pinned ?? false
            tab.isMuted = false // isMuted is session-only, always reset on restore
          }
          // If user disabled tab restore, clear all rehydrated tabs and start fresh
          const { restoreTabs } = useSettingsStore.getState()
          if (!restoreTabs) {
            state.tabs = {}
            state.tabOrder = []
            state.activeTabId = null
            state.splitTabId = null
            state.focusedPanel = 'primary'
            return
          }
          // Unsuspend the active tab(s) so they load immediately
          const activeTab = state.activeTabId ? state.tabs[state.activeTabId] : undefined
          if (activeTab) activeTab.isSuspended = false
          const splitTab = state.splitTabId ? state.tabs[state.splitTabId] : undefined
          if (splitTab) splitTab.isSuspended = false
          // Clear stale split state if the split tab no longer exists
          if (state.splitTabId && !state.tabs[state.splitTabId]) {
            state.splitTabId = null
            state.focusedPanel = 'primary'
          }
          // Clear stale activeTabId if the tab no longer exists
          if (state.activeTabId && !state.tabs[state.activeTabId]) {
            state.activeTabId = state.tabOrder[0] ?? null
          }
        }
      }
    ),
    { name: 'TabStore', enabled: import.meta.env.DEV }
  )
)
