import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { URLBar } from './URLBar'

// Mock hooks and stores
vi.mock('@/hooks/useTabSelector', () => ({
  useFocusedTabId: () => 'tab-1',
  useFocusedTabUrl: () => 'https://example.com',
  useFocusedTabIsPrivate: () => false,
  useFocusedTabNavState: () => ({ isLoading: false, loadProgress: 0 }),
  useFocusedTabMediaPlaying: () => false
}))

vi.mock('@/store/tabStore', () => ({
  useTabStore: vi.fn((selector) => selector({
    updateTab: vi.fn(),
    tabs: { 'tab-1': { title: 'Example', favicon: '' } }
  }))
}))

vi.mock('@/store/uiStore', () => ({
  useUIStore: Object.assign(vi.fn((selector) => selector({
    urlBarFocusRequested: false,
    clearUrlBarFocus: vi.fn()
  })), {
    getState: () => ({
      clearUrlBarFocus: vi.fn(),
      toggleSettings: vi.fn()
    })
  })
}))

vi.mock('@/store/accountStore', () => {
  const state = {
    activeAccountId: 'default',
    accountOrder: ['default'],
    accounts: {
      default: {
        id: 'default',
        name: 'Personal',
        partitionId: 'persist:default',
        activeSpaceId: 'general',
        spaceOrder: ['general'],
        spaces: { general: { id: 'general', name: 'General', tabIds: ['tab-1'], activeTabId: 'tab-1' } }
      }
    },
    switchAccount: vi.fn(),
    switchSpace: vi.fn()
  }
  return {
    useAccountStore: Object.assign(vi.fn((selector) => selector(state)), { getState: () => state }),
    getPartitionForAccount: () => 'persist:default'
  }
})

vi.mock('@/store/sitePermissionsStore', () => ({
  getOriginFromUrl: (url: string) => new URL(url).origin,
  SITE_PERMISSION_LABELS: {
    media: 'Camera and microphone'
  },
  useSitePermissionsStore: vi.fn((selector) => selector({
    entries: {},
    resetOrigin: vi.fn()
  }))
}))

vi.mock('@/store/historyStore', () => ({
  useHistoryStore: {
    getState: () => ({
      search: vi.fn().mockReturnValue([
        { url: 'https://history.com', title: 'History Site', visitCount: 1, lastVisit: 1 }
      ])
    })
  }
}))

vi.mock('@/store/bookmarkStore', () => ({
  useBookmarkStore: Object.assign(vi.fn((selector) => selector({
    isBookmarked: vi.fn().mockReturnValue(false),
    addBookmark: vi.fn(),
    removeBookmark: vi.fn()
  })), {
    getState: () => ({
      isBookmarked: vi.fn().mockReturnValue(false),
      addBookmark: vi.fn(),
      removeBookmark: vi.fn(),
      search: vi.fn().mockReturnValue([])
    })
  })
}))

vi.mock('@/utils/searchUtils', () => ({
  fetchSearchSuggestions: vi.fn().mockResolvedValue(['search suggestion 1', 'search suggestion 2'])
}))

vi.mock('@/webview/webviewRegistry', () => ({
  webviewRegistry: {
    get: vi.fn().mockReturnValue({
      reload: vi.fn(),
      stop: vi.fn(),
      getWebContentsId: vi.fn().mockReturnValue(1)
    })
  }
}))

// Mock window.electronAPI
window.electronAPI = {
  requestPiP: vi.fn(),
  getSiteInfo: vi.fn().mockResolvedValue({
    cookieCount: 0,
    cacheSize: 0,
    adblockerEnabled: true
  }),
  clearSiteData: vi.fn().mockResolvedValue(true),
  forgetSite: vi.fn().mockResolvedValue(true)
} as any

describe('URLBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with simplified URL when unfocused', () => {
    render(<URLBar />)
    const input = screen.getByPlaceholderText('Search or enter URL') as HTMLInputElement
    expect(input.value).toBe('example.com')
  })

  it('shows full URL when focused', async () => {
    render(<URLBar />)
    const input = screen.getByPlaceholderText('Search or enter URL') as HTMLInputElement
    
    fireEvent.focus(input)
    
    await waitFor(() => {
      expect(input.value).toBe('https://example.com')
    })
  })

  it('shows clear button when focused and has text', async () => {
    render(<URLBar />)
    const input = screen.getByPlaceholderText('Search or enter URL') as HTMLInputElement
    
    fireEvent.focus(input)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Clear address bar')).toBeInTheDocument()
    })
  })

  it('clears input when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<URLBar />)
    const input = screen.getByPlaceholderText('Search or enter URL') as HTMLInputElement
    
    fireEvent.focus(input)
    
    const clearBtn = await screen.findByLabelText('Clear address bar')
    await user.click(clearBtn)
    
    expect(input.value).toBe('')
  })

  it('opens site info popover when security icon is clicked', async () => {
    const user = userEvent.setup()
    render(<URLBar />)
    
    const siteInfoBtn = screen.getByLabelText('Site information')
    await user.click(siteInfoBtn)
    
    expect(await screen.findByText(/Secure connection/)).toBeInTheDocument()
  })
})
