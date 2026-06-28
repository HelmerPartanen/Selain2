import { lazy, memo, Suspense, useCallback, useDeferredValue, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { SvgIcon, PIP_SVG } from '@/components/ui/SvgIcon'
import roundArrowsSvg from '@/assets/icons/Arrows/Round_Arrows_2.svg?raw'
import lockFillSvg from '@/assets/icons/Objects/Lock_Fill.svg?raw'
import globeSvg from '@/assets/icons/Nature/Globe_Fill.svg?raw'
import searchSvg from '@/assets/icons/Objects/Search.svg?raw'
import counterclockwiseSvg from '@/assets/icons/Arrows/Counterclockwise.svg?raw'
import bookmarkSvg from '@/assets/icons/Objects/Bookmark.svg?raw'
import bookmarkFillSvg from '@/assets/icons/Objects/Bookmark_Fill.svg?raw'
import { useFocusedTabId, useFocusedTabUrl, useFocusedTabNavState, useFocusedTabMediaPlaying, useFocusedTabIsPrivate } from '@/hooks/useTabSelector'
import soundFillSvg from '@/assets/icons/Objects/Sound_Wave_2_Fill.svg?raw'
import soundMuteSvg from '@/assets/icons/Objects/Sound_Mute.svg?raw'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { useHistoryStore, type HistoryEntry } from '@/store/historyStore'
import { useBookmarkStore } from '@/store/bookmarkStore'
import { useAccountStore } from '@/store/accountStore'
import { simplifyUrl, normalizeURL } from '@/utils/urlUtils'
import { logger } from '@/utils/logger'
import { fetchSearchSuggestions } from '@/utils/searchUtils'
import { webviewRegistry } from '@/webview/webviewRegistry'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { SearchInput } from '@/components/ui/Search'
import { getTabDomain } from '@/utils/tabAnalysis'

import { SPRING_FAST, SPRING_EXPAND, SPRING_SNAPPY } from '@/utils/springs'

const SiteInfoPopover = lazy(() =>
  import('./SiteInfoPopover').then((module) => ({
    default: module.SiteInfoPopover,
  })),
)

type Suggestion = HistoryEntry & {
  id?: string
  lastVisit?: number
  type?: 'history' | 'search' | 'bookmark' | 'command' | 'tab' | 'space' | 'settings'
  action?: () => void
}

function makeCommandSuggestion(id: string, title: string, action: () => void, type: Suggestion['type'] = 'command'): Suggestion {
  return {
    id,
    url: `command://${id}`,
    title,
    visitCount: 0,
    lastVisit: 0,
    timestamp: Date.now(),
    favicon: '',
    type,
    action,
  }
}

function URLBarInner({
  onFocusChange,
  layout = 'floating',
  popoverDirection = 'up',
}: {
  onFocusChange?: (focused: boolean) => void
  layout?: 'floating' | 'classic'
  popoverDirection?: 'up' | 'down'
}): React.JSX.Element {
  const tabId = useFocusedTabId()
  const url = useFocusedTabUrl()
  const isPrivate = useFocusedTabIsPrivate()
  const { isLoading } = useFocusedTabNavState()
  const updateTab = useTabStore((s) => s.updateTab)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const skipNextFocusRestoreRef = useRef(false)
  const [inputValue, setInputValue] = useState('')
  const deferredInputValue = useDeferredValue(inputValue)
  const [isFocused, setIsFocused] = useState(false)

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [suggestionsUnavailable, setSuggestionsUnavailable] = useState<null | 'offline' | 'error'>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestionRequestIdRef = useRef(0)
  const suggestionAbortRef = useRef<AbortController | null>(null)

  const [isSiteInfoOpen, setIsSiteInfoOpen] = useState(false)
  const suggestionListId = `urlbar-suggestions-${tabId ?? 'empty'}`
  const activeSuggestionId = selectedIndex >= 0 && suggestions[selectedIndex]
    ? `${suggestionListId}-option-${selectedIndex}`
    : undefined

  const closeTransientUrlUI = useCallback(() => {
    suggestionRequestIdRef.current += 1
    suggestionAbortRef.current?.abort()
    suggestionAbortRef.current = null
    setSuggestions([])
    setSelectedIndex(-1)
    setSuggestionsUnavailable(null)
    setIsSiteInfoOpen(false)
  }, [])

  // URL bar focus request from keyboard shortcuts
  const urlBarFocusRequested = useUIStore((s) => s.urlBarFocusRequested)
  useEffect(() => {
    if (urlBarFocusRequested) {
      inputRef.current?.focus()
      useUIStore.getState().clearUrlBarFocus()
    }
  }, [urlBarFocusRequested])

  useEffect(() => {
    if (!isFocused) {
      setInputValue(url === 'about:blank' || url.startsWith('browser://') ? '' : simplifyUrl(url))
      setSuggestions([])
      setSelectedIndex(-1)
    }
  }, [url, isFocused])

  useEffect(() => {
    if (!isFocused && !isSiteInfoOpen) return

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      closeTransientUrlUI()
      setIsFocused(false)
      onFocusChange?.(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [closeTransientUrlUI, isFocused, isSiteInfoOpen, onFocusChange])

  // Debounced autocomplete search
  useEffect(() => {
    if (!isFocused || deferredInputValue.length < 2) {
      suggestionRequestIdRef.current += 1
      suggestionAbortRef.current?.abort()
      suggestionAbortRef.current = null
      setSuggestions([])
      setSelectedIndex(-1)
      setSuggestionsUnavailable(null)
      return
    }

    const query = deferredInputValue
    const requestId = ++suggestionRequestIdRef.current
    let controller: AbortController | null = null
    setSuggestionsUnavailable(null)

    const makeCommandResults = (): Suggestion[] => {
      const raw = query.trim()
      if (!raw.startsWith('@')) return []
      const [scopeRaw = '', ...rest] = raw.slice(1).split(/\s+/)
      const scope = scopeRaw.toLowerCase()
      const term = rest.join(' ').toLowerCase()
      const tabStore = useTabStore.getState()
      const accountStore = useAccountStore.getState()
      const activeAccount = accountStore.accounts[accountStore.activeAccountId]
      const activeTab = tabStore.activeTabId ? tabStore.tabs[tabStore.activeTabId] : null
      if (scope === 'tabs') {
        return tabStore.tabOrder
          .map((id) => tabStore.tabs[id])
          .filter(Boolean)
          .filter((tab) => !term || tab!.title.toLowerCase().includes(term) || tab!.url.toLowerCase().includes(term))
          .slice(0, 8)
          .map((tab) => makeCommandSuggestion(`tab-${tab!.id}`, `Switch to ${tab!.title || simplifyUrl(tab!.url)}`, () => tabStore.setActiveTab(tab!.id), 'tab'))
      }
      if (scope === 'history') return isPrivate ? [] : useHistoryStore.getState().search(term || raw).map((entry) => ({ ...entry, type: 'history' as const }))
      if (scope === 'bookmarks') return useBookmarkStore.getState().search(term).slice(0, 8).map((b) => ({
        id: `bookmark-${b.id}`, url: b.url, title: b.title, favicon: b.favicon ?? '', visitCount: 0, lastVisit: 0, timestamp: b.createdAt, type: 'bookmark' as const
      }))
      if (scope === 'spaces') {
        if (!activeAccount) return []
        return activeAccount.spaceOrder
          .map((id) => activeAccount.spaces[id])
          .filter(Boolean)
          .filter((space) => !term || space!.name.toLowerCase().includes(term))
          .map((space) => makeCommandSuggestion(`space-${space!.id}`, `Switch to ${activeAccount.name} / ${space!.name}`, () => {
            accountStore.switchSpace(space!.id)
            const target = space!.activeTabId || space!.tabIds.find((id) => tabStore.tabs[id])
            if (target && tabStore.tabs[target]) tabStore.setActiveTab(target)
            else tabStore.addTab()
          }, 'space'))
      }
      if (scope === 'accounts') {
        return accountStore.accountOrder
          .map((id) => accountStore.accounts[id])
          .filter(Boolean)
          .filter((account) => !term || account!.name.toLowerCase().includes(term))
          .map((account) => makeCommandSuggestion(`account-${account!.id}`, `Switch to account: ${account!.name}`, () => {
            accountStore.switchAccount(account!.id)
            const space = account!.spaces[account!.activeSpaceId]
            const target = space?.activeTabId || space?.tabIds.find((id) => tabStore.tabs[id])
            if (target && tabStore.tabs[target]) tabStore.setActiveTab(target)
            else tabStore.addTab()
          }, 'space'))
      }
    if (scope === 'settings') {
        return ['General', 'Privacy', 'Search engine', 'Shortcuts', 'Appearance'].filter((name) => !term || name.toLowerCase().includes(term)).map((name) =>
          makeCommandSuggestion(`settings-${name}`, `Open ${name} settings`, () => useUIStore.getState().toggleSettings(), 'settings')
        )
      }
      if (scope === 'site' && activeTab) {
        const domain = getTabDomain(activeTab.url)
        return [
          makeCommandSuggestion('site-close-domain', `Close tabs from ${domain}`, () => {
            const state = useTabStore.getState()
            state.tabOrder.forEach((id) => {
              const tab = state.tabs[id]
              if (tab && id !== state.activeTabId && getTabDomain(tab.url) === domain) state.removeTab(id)
            })
          }),
          makeCommandSuggestion('site-privacy', `Open privacy settings for ${domain}`, () => useUIStore.getState().toggleSettings(), 'settings'),
        ]
      }
      return [
        makeCommandSuggestion('hint-tabs', '@tabs: search open tabs', () => {}),
        makeCommandSuggestion('hint-history', '@history: search history', () => {}),
        makeCommandSuggestion('hint-bookmarks', '@bookmarks: search bookmarks', () => {}),
        makeCommandSuggestion('hint-spaces', '@spaces: switch spaces', () => {}),
        makeCommandSuggestion('hint-settings', '@settings: open settings', () => {}),
      ]
    }

    const commandResults = makeCommandResults()
    if (commandResults.length > 0) {
      setSuggestions(commandResults)
      setSelectedIndex(-1)
      return
    }

    // Always compute local results immediately so the list feels instant.
    const historyResults = isPrivate
      ? []
      : useHistoryStore
        .getState()
        .search(query)
        .map(r => ({ ...r, type: 'history' as const }))

    const bookmarkResults = useBookmarkStore
      .getState()
      .search(query)
      .slice(0, 6)
      .map(b => ({
        id: `bookmark-${b.id}`,
        url: b.url,
        title: b.title,
        favicon: b.favicon ?? '',
        visitCount: 0,
        lastVisit: 0,
        timestamp: b.createdAt,
        type: 'bookmark' as const
      }))

    const seedMap = new Map<string, Suggestion>()
    for (const item of [...historyResults, ...bookmarkResults]) {
      seedMap.set(item.url, item)
    }
    const initial = Array.from(seedMap.values())
    setSuggestions(initial.slice(0, 8))
    setSelectedIndex(-1)

    suggestionAbortRef.current?.abort()
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      controller = new AbortController()
      suggestionAbortRef.current = controller

      if (!navigator.onLine) {
        if (suggestionRequestIdRef.current === requestId && !controller.signal.aborted) {
          setSuggestionsUnavailable('offline')
        }
        return
      }

      let searchResults: (HistoryEntry & { type: 'search' })[] = []
      try {
        const liveSuggestions = await fetchSearchSuggestions(query, controller.signal)
        searchResults = liveSuggestions.map(phrase => ({
          id: `search-${phrase}`,
          url: normalizeURL(phrase),
          title: phrase,
          visitCount: 0,
          lastVisit: 0,
          timestamp: Date.now(),
          favicon: '',
          type: 'search' as const
        }))
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError') && suggestionRequestIdRef.current === requestId && !controller.signal.aborted) {
          logger.error('Failed to fetch live suggestions', e)
          setSuggestionsUnavailable('error')
        }
      }

      // Ignore stale responses from older input values.
      if (suggestionRequestIdRef.current !== requestId || controller.signal.aborted) return

      // Combine and deduplicate by URL, preferring history/bookmarks over search
      const combined = [...initial, ...searchResults]
      const byUrl = new Map<string, Suggestion>()
      for (const item of combined) {
        const existing = byUrl.get(item.url)
        if (!existing) {
          byUrl.set(item.url, item)
          continue
        }
        if (item.type === 'history' || item.type === 'bookmark') {
          byUrl.set(item.url, item)
        }
      }
      const unique = Array.from(byUrl.values())

      setSuggestions(unique.slice(0, 8))
      setSelectedIndex(-1)
    }, 150)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (controller) controller.abort()
      if (suggestionAbortRef.current === controller) {
        suggestionAbortRef.current = null
      }
    }
  }, [deferredInputValue, isFocused, isPrivate])

  const navigate = useCallback(
    (targetUrl: string) => {
      if (!tabId) return
      updateTab(tabId, { url: normalizeURL(targetUrl) })
      setSuggestions([])
      setSelectedIndex(-1)
    },
    [tabId, updateTab]
  )

  const chooseSuggestion = useCallback((suggestion: Suggestion) => {
    if (suggestion.action) {
      suggestion.action()
      setSuggestions([])
      setSelectedIndex(-1)
    } else {
      navigate(suggestion.url)
    }
    inputRef.current?.blur()
  }, [navigate])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const currentSuggestions = suggestionRequestIdRef.current >= 0 ? suggestions : []
      if (currentSuggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % currentSuggestions.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => (prev <= 0 ? currentSuggestions.length - 1 : prev - 1))
          return
        }
        if (e.key === 'Home') {
          e.preventDefault()
          setSelectedIndex(0)
          return
        }
        if (e.key === 'End') {
          e.preventDefault()
          setSelectedIndex(currentSuggestions.length - 1)
          return
        }
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const suggestion = selectedIndex >= 0 ? currentSuggestions[selectedIndex] : undefined
        if (suggestion) chooseSuggestion(suggestion)
        else {
          navigate(inputValue)
          inputRef.current?.blur()
        }
      } else if (e.key === 'Escape') {
        if (currentSuggestions.length > 0) {
          closeTransientUrlUI()
        } else {
          setIsSiteInfoOpen(false)
          setInputValue(url === 'about:blank' || url.startsWith('browser://') ? '' : url)
          inputRef.current?.blur()
        }
      }
    },
    [chooseSuggestion, inputValue, navigate, selectedIndex, url, suggestions]
  )

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    onFocusChange?.(true)
    if (skipNextFocusRestoreRef.current) {
      skipNextFocusRestoreRef.current = false
    } else {
      setInputValue(url === 'about:blank' || url.startsWith('browser://') ? '' : url)
    }
    requestAnimationFrame(() => inputRef.current?.select())
  }, [url, onFocusChange])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onFocusChange?.(false)
    closeTransientUrlUI()
  }, [closeTransientUrlUI, onFocusChange])

  const handleSuggestionClick = useCallback(
    (suggestion: Suggestion) => {
      chooseSuggestion(suggestion)
    },
    [chooseSuggestion]
  )

  const handleReloadOrStop = useCallback(() => {
    if (!tabId) return
    const webview = webviewRegistry.get(tabId)
    if (!webview) return
    isLoading ? webview.stop() : webview.reload()
  }, [tabId, isLoading])

  const isSecure = url.startsWith('https://')
  const hasUrl = !!url && url !== 'about:blank' && !url.startsWith('browser://')

  const iconKey = !isFocused && hasUrl ? (isSecure ? 'lock' : 'globe') : 'search'

  // Bookmark state
  const isBookmarked = useBookmarkStore((s) => s.isBookmarked(url))
  const handleToggleBookmark = useCallback(() => {
    if (!hasUrl) return
    const store = useBookmarkStore.getState()
    if (store.isBookmarked(url)) {
      store.removeBookmark(url)
    } else {
      const tab = tabId ? useTabStore.getState().tabs[tabId] : null
      store.addBookmark(url, tab?.title || url, tab?.favicon)
    }
  }, [url, hasUrl, tabId])

  // PiP state
  const isPlayingMedia = useFocusedTabMediaPlaying()
  const isMuted = useTabStore((s) => tabId ? (s.tabs[tabId]?.isMuted ?? false) : false)
  const handleToggleMute = useCallback(() => {
    if (tabId) useTabStore.getState().toggleMute(tabId)
  }, [tabId])
  const handlePiP = useCallback(() => {
    if (!tabId) return
    const webview = webviewRegistry.get(tabId)
    if (!webview) return
    const webContentsId = (webview as any).getWebContentsId()
    if (webContentsId) {
      window.electronAPI.requestPiP(webContentsId)
    }
  }, [tabId])

  const isClassic = layout === 'classic'
  const dropdownBelow = popoverDirection === 'down'
  const hasUrlTransientUI =
    isFocused ||
    isSiteInfoOpen ||
    suggestions.length > 0 ||
    Boolean(suggestionsUnavailable)

  const dropdownOffsetClass = dropdownBelow
    ? isClassic
      ? 'top-full mt-1'
      : 'top-full mt-2.5'
    : 'bottom-full mb-2.5'

  const autocompleteSurface = 'border border-[var(--app-separator)] bg-[var(--app-bg-secondary)] text-[var(--app-text-primary)]'

  const shellClassName = [
    'relative flex max-w-full min-w-0 items-center overflow-hidden rounded-xl transition-colors duration-150',
    isClassic ? 'h-8 w-full px-0.5' : 'h-10 px-1',
    isClassic && isFocused
      ? 'bg-[var(--app-control-hover)]'
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  const toolbarButtonClass = isClassic
    ? '!h-7 !w-7 !min-w-[28px] !shrink-0 !p-0'
    : '!h-8 !w-8 !min-w-[32px] !shrink-0 !p-0'

  const trailingControlWidth = isClassic ? 28 : 32

  return (
    <div
      ref={rootRef}
      className={[
        'relative min-w-0 max-w-full',
        isClassic ? 'w-full' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {hasUrlTransientUI && (
        <div
          className="fixed inset-0 z-[44] [app-region:no-drag]"
          onMouseDown={() => {
            closeTransientUrlUI()
            setIsFocused(false)
            onFocusChange?.(false)
            inputRef.current?.blur()
          }}
        />
      )}

      <m.div
        className={shellClassName}
        animate={
          isClassic
            ? undefined
            : {
                width: isFocused ? 500 : 320,
              }
        }
        transition={isClassic ? undefined : SPRING_EXPAND}
        style={isClassic ? undefined : { maxWidth: 'calc(100vw - 2rem)' }}
      >
        <Button
          variant="icon"
          onClick={handleReloadOrStop}
          aria-label={isLoading ? 'Stop loading' : 'Reload'}
          className={toolbarButtonClass}
        >
          <span className="relative flex h-[15px] w-[15px] items-center justify-center">
            <AnimatePresence mode="popLayout" initial={false}>
              <m.span
                key={isLoading ? 'stop' : 'reload'}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0, position: 'absolute' }}
                transition={SPRING_FAST}
                className="flex items-center justify-center"
              >
                {isLoading ? (
                  <LoadingSpinner size={15} inheritColor />
                ) : (
                  <SvgIcon svg={roundArrowsSvg} size={15} />
                )}
              </m.span>
            </AnimatePresence>
          </span>
        </Button>

        <SearchInput
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls={suggestions.length > 0 ? suggestionListId : undefined}
          aria-activedescendant={activeSuggestionId}
          placeholder="Search or enter URL"
          spellCheck={false}
          autoComplete="off"
          clearable
          clearVisible={isFocused && inputValue.length > 0 && !isLoading}
          clearLabel="Clear address bar"
          onClear={() => {
            skipNextFocusRestoreRef.current = true
            setInputValue('')
            inputRef.current?.focus()
          }}
          leadingSlot={
            iconKey === 'search' ? (
              <span className="flex items-center justify-center text-[var(--app-text-secondary)]">
                <SvgIcon svg={searchSvg} size={14} />
              </span>
            ) : (
              <Button
                variant="icon"
                size="none"
                type="button"
                className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-md text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                aria-label="Site information"
                onMouseDown={(e) => {
                  e.preventDefault()
                }}
                onClick={() => setIsSiteInfoOpen((open) => !open)}
              >
                {iconKey === 'lock' ? (
                  <SvgIcon svg={lockFillSvg} size={14} className="text-[var(--app-success)]" />
                ) : (
                  <SvgIcon svg={globeSvg} size={14} />
                )}
              </Button>
            )
          }
        />

        <div className="flex shrink-0 items-center gap-0.5">
          <AnimatePresence initial={false}>
            {hasUrl && !isFocused && (
              <m.div
                initial={{ width: 0, opacity: 0, scale: 0.8 }}
                animate={{ width: trailingControlWidth, opacity: 1, scale: 1 }}
                exit={{ width: 0, opacity: 0, scale: 0.8 }}
                transition={SPRING_SNAPPY}
                className="flex shrink-0 items-center justify-center overflow-hidden"
              >
                <Button
                  variant="icon"
                  onClick={handleToggleBookmark}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                  className={toolbarButtonClass}
                >
                  <span className="relative flex h-[15px] w-[15px] items-center justify-center">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <m.span
                        key={isBookmarked ? 'filled' : 'empty'}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0, position: 'absolute' }}
                        transition={SPRING_FAST}
                        className="flex items-center justify-center"
                      >
                        <SvgIcon
                          svg={isBookmarked ? bookmarkFillSvg : bookmarkSvg}
                          size={14}
                          className={
                            isBookmarked
                              ? 'text-[var(--app-accent)]'
                              : 'text-[var(--app-text-tertiary)]'
                          }
                        />
                      </m.span>
                    </AnimatePresence>
                  </span>
                </Button>
              </m.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {isPlayingMedia && !isFocused && (
              <m.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: trailingControlWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={SPRING_FAST}
                className="flex shrink-0 items-center justify-center overflow-hidden"
              >
                <Button
                  variant="icon"
                  onClick={handlePiP}
                  aria-label="Picture in Picture"
                  className={`${toolbarButtonClass} text-[var(--app-text-tertiary)]`}
                >
                  <SvgIcon svg={PIP_SVG} size={15} />
                </Button>
              </m.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {(isPlayingMedia || isMuted) && !isFocused && (
              <m.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: trailingControlWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={SPRING_FAST}
                className="flex shrink-0 items-center justify-center overflow-hidden"
              >
                <Button
                  variant="icon"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Unmute tab' : 'Mute tab'}
                  className={`${toolbarButtonClass} ${
                    isMuted
                      ? 'text-[var(--app-danger)]'
                      : 'text-[var(--app-text-tertiary)]'
                  }`}
                >
                  <SvgIcon svg={isMuted ? soundMuteSvg : soundFillSvg} size={15} />
                </Button>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </m.div>

      <AnimatePresence>
        {(suggestions.length > 0 ||
          (isFocused && deferredInputValue.length >= 2 && suggestionsUnavailable)) &&
          isFocused && (
            <m.div
              id={suggestionListId}
              role="listbox"
              aria-label="Suggestions"
              className={`absolute left-0 right-0 z-[100] overflow-hidden rounded-xl p-1 shadow-sm ${autocompleteSurface} ${dropdownOffsetClass}`}
              style={{ originY: dropdownBelow ? 0 : 1 }}
              initial={{ scale: 0.98, opacity: 0, y: dropdownBelow ? -4 : 4 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: dropdownBelow ? -4 : 4 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
            >
              {suggestions.map((entry, i) => {
                const isActive = selectedIndex === i
                const isHovered = hoveredIdx === i

                return (
                  <Button
                    id={`${suggestionListId}-option-${i}`}
                    role="option"
                    aria-selected={isActive}
                    variant="ghost"
                    size="none"
                    type="button"
                    key={entry.id ?? entry.url}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSuggestionClick(entry)
                    }}
                    onMouseEnter={() => {
                      setHoveredIdx(i)
                      setSelectedIndex(i)
                    }}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`relative flex h-9 w-full min-w-0 items-center gap-2.5 rounded-lg px-3 text-left transition-colors duration-75 ${
                      isActive || isHovered
                        ? 'bg-[var(--app-bg-quaternary)] text-[var(--app-text-primary)]'
                        : 'text-[var(--app-text-secondary)]'
                    }`}
                  >
                    {entry.type === 'search' ? (
                      <SvgIcon
                        svg={searchSvg}
                        size={14}
                        className="shrink-0 text-[var(--app-text-tertiary)]"
                      />
                    ) : entry.favicon ? (
                      <img
                        src={entry.favicon}
                        alt=""
                        className="h-4 w-4 shrink-0 rounded-sm object-contain"
                      />
                    ) : (
                      <SvgIcon
                        svg={counterclockwiseSvg}
                        size={14}
                        className="shrink-0 text-[var(--app-text-tertiary)]"
                      />
                    )}

                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      {entry.title || simplifyUrl(entry.url)}
                    </span>

                    {(entry.type === 'history' || entry.type === 'bookmark') && (
                      <span className="hidden max-w-[160px] shrink truncate text-[10px] text-[var(--app-text-tertiary)] sm:block">
                        {simplifyUrl(entry.url)}
                      </span>
                    )}

                    {entry.type &&
                      entry.type !== 'search' &&
                      entry.type !== 'command' && (
                        <span className="hidden shrink-0 text-[10px] uppercase tracking-wide text-[var(--app-text-tertiary)] md:block">
                          {entry.type === 'history'
                            ? 'History'
                            : entry.type === 'bookmark'
                              ? 'Bookmark'
                              : entry.type === 'tab'
                                ? 'Tab'
                                : entry.type === 'space'
                                  ? 'Space'
                                  : entry.type === 'settings'
                                    ? 'Settings'
                                    : null}
                        </span>
                      )}
                  </Button>
                )
              })}

              {suggestionsUnavailable && (
                <div
                  className="mt-1 border-t border-[var(--app-separator)] px-3 py-2 text-[11px] text-[var(--app-text-secondary)]"
                  role="status"
                >
                  {suggestionsUnavailable === 'offline'
                    ? "Offline. Live suggestions unavailable."
                    : 'Search suggestions are unavailable.'}
                </div>
              )}
            </m.div>
          )}
      </AnimatePresence>

      {isSiteInfoOpen && (
        <Suspense fallback={null}>
          <SiteInfoPopover
            isOpen={isSiteInfoOpen}
            onClose={() => setIsSiteInfoOpen(false)}
            url={url}
            isSecure={isSecure}
            popoverDirection={popoverDirection}
            anchorLeft={isClassic}
          />
        </Suspense>
      )}
    </div>
  )
}

export const URLBar = memo(URLBarInner)
