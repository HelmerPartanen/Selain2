import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'

export interface Tab {
  id: string
  url: string
  title: string
  favicon: string
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
  isSuspended: boolean
}

export interface TabStore {
  tabs: Record<string, Tab>
  tabOrder: string[]
  activeTabId: string | null

  addTab: (url?: string) => string
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTab: (id: string, patch: Partial<Omit<Tab, 'id'>>) => void
  reorderTab: (fromIndex: number, toIndex: number) => void
  suspendTab: (id: string) => void
  restoreTab: (id: string) => void
}

function createTab(url: string): Tab {
  return {
    id: crypto.randomUUID(),
    url,
    title: 'New Tab',
    favicon: '',
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    isSuspended: false
  }
}

export const useTabStore = create<TabStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      tabs: {},
      tabOrder: [],
      activeTabId: null,

      addTab: (url = 'about:blank') => {
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

        const newOrder = state.tabOrder.filter((tid) => tid !== id)
        const newTabs = { ...state.tabs }
        delete newTabs[id]

        let newActiveId = state.activeTabId
        if (state.activeTabId === id) {
          if (newOrder.length === 0) {
            newActiveId = null
          } else if (index >= newOrder.length) {
            newActiveId = newOrder[newOrder.length - 1] ?? null
          } else {
            newActiveId = newOrder[index] ?? null
          }
        }

        set(
          { tabs: newTabs, tabOrder: newOrder, activeTabId: newActiveId },
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
        if (tab && tab.isSuspended) {
          set(
            (s) => ({
              activeTabId: id,
              tabs: {
                ...s.tabs,
                [id]: { ...tab, isSuspended: false }
              }
            }),
            undefined,
            'setActiveTab/restore'
          )
        } else {
          set({ activeTabId: id }, undefined, 'setActiveTab')
        }
      },

      updateTab: (id, patch) => {
        set(
          (state) => {
            const existing = state.tabs[id]
            if (!existing) return state
            return {
              tabs: { ...state.tabs, [id]: { ...existing, ...patch } }
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

      restoreTab: (id) => {
        set(
          (state) => {
            const tab = state.tabs[id]
            if (!tab || !tab.isSuspended) return state
            return {
              tabs: {
                ...state.tabs,
                [id]: { ...tab, isSuspended: false }
              }
            }
          },
          undefined,
          'restoreTab'
        )
      }
    })),
    { name: 'TabStore', enabled: import.meta.env.DEV }
  )
)
