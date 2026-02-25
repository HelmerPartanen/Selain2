import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { useSettingsStore } from './settingsStore'
import { createIPCStorage } from './ipcStorage'

export interface Tab {
  id: string
  url: string
  title: string
  favicon: string
  isLoading: boolean
  isPlayingMedia: boolean
  canGoBack: boolean
  canGoForward: boolean
  isSuspended: boolean
  loadProgress: number
  /** URL to navigate to when webview has no back history (e.g. browser://newtab) */
  virtualBackUrl: string | null
  /** URL to navigate forward to when on a special page */
  virtualForwardUrl: string | null
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
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTab: (id: string, patch: Partial<Omit<Tab, 'id'>>) => void
  reorderTab: (fromIndex: number, toIndex: number) => void
  suspendTab: (id: string) => void

  // Split view actions
  splitTab: (tabId: string) => void
  unsplit: () => void
  setFocusedPanel: (panel: FocusedPanel) => void
  swapSplitPanels: () => void

  // Reopen closed tab
  reopenLastClosed: () => void
}

/** Shape persisted to disk — a subset of TabStore without action methods */
type PersistedTabState = Pick<TabStore, 'tabOrder' | 'activeTabId' | 'splitTabId' | 'focusedPanel'> & {
  tabs: Record<string, Omit<Tab, 'isPlayingMedia' | 'virtualBackUrl' | 'virtualForwardUrl'>>
}

function isSpecialPage(url: string): boolean {
  return url === 'browser://newtab'
}

function createTab(url: string): Tab {
  return {
    id: crypto.randomUUID(),
    url,
    title: 'New Tab',
    favicon: '',
    isLoading: false,
    isPlayingMedia: false,
    canGoBack: false,
    canGoForward: false,
    isSuspended: false,
    loadProgress: 0,
    virtualBackUrl: null,
    virtualForwardUrl: null
  }
}

const MAX_RECENTLY_CLOSED = 10

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
            (state) => ({
              tabs: { ...state.tabs, [tab.id]: tab },
              tabOrder: [...state.tabOrder, tab.id],
              activeTabId: tab.id
            }),
            undefined,
            'addTab'
          )
          return tab.id
        },

        removeTab: (id) => {
          const state = get()
          const index = state.tabOrder.indexOf(id)
          if (index === -1) return

          const closedTab = state.tabs[id]

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
                      virtualForwardUrl: null
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
                  [id]: { ...tab, isSuspended: false }
                }
              }),
              undefined,
              'setActiveTab/restore'
            )
          } else {
            set(patch, undefined, 'setActiveTab')
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
              return {
                tabs: { ...state.tabs, [id]: merged }
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

        suspendTab: (id) => {
          set(
            (state) => {
              const tab = state.tabs[id]
              if (!tab || tab.isSuspended) return state
              return {
                tabs: {
                  ...state.tabs,
                  [id]: { ...tab, isSuspended: true }
                }
              }
            },
            undefined,
            'suspendTab'
          )
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
        }
      })),
      {
        name: 'tab-session',
        version: 1,
        storage: createIPCStorage<PersistedTabState>(),
        partialize: (state): PersistedTabState => ({
          tabOrder: state.tabOrder,
          activeTabId: state.activeTabId,
          splitTabId: state.splitTabId,
          focusedPanel: state.focusedPanel,
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
                canGoBack: false,
                canGoForward: false,
                isSuspended: true, // All restored tabs start suspended
                loadProgress: 0
              }
            ])
          )
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return
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
        }
      }
    ),
    { name: 'TabStore', enabled: import.meta.env.DEV }
  )
)
