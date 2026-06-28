import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { TextInput } from '@/components/ui/Input'
import { SvgIcon } from '@/components/ui/SvgIcon'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import boxSvg from '@/assets/icons/Objects/Box.svg?raw'
import personSvg from '@/assets/icons/Human/Person_User.svg?raw'
import pencilSvg from '@/assets/icons/Objects/Pencil.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import lockSvg from '@/assets/icons/Objects/Lock.svg?raw'
import checkSvg from '@/assets/icons/Interface/Check.svg?raw'
import rightSmallSvg from '@/assets/icons/Arrows/Right_Small.svg?raw'
import { useAccountStore, DEFAULT_ACCOUNT_ID, DEFAULT_SPACE_ID, type AccountSpace, type BrowserAccount } from '@/store/accountStore'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { SPACE_PRESET_HUES } from '@/store/spaceStore'
import { verifyAccountPassword } from '@/utils/accountSecurity'
import { SPRING_SNAPPY } from '@/utils/springs'
import { clampPopoverLeft, getPopoverMotion } from '@/utils/popoverPosition'

const POPOVER_WIDTH = 360

function AccountAvatar({ account, size = 28 }: { account: BrowserAccount; size?: number }): React.JSX.Element {
  const style = { width: size, height: size, background: `hsl(${account.colorHue} 55% 52%)` }
  return account.avatarDataUrl ? (
    <img src={account.avatarDataUrl} alt="" draggable={false} className="shrink-0 rounded-full object-cover" style={style} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full text-white shadow-sm" style={style}>
      <Text as="span" size="caption" className="text-white">{account.name.slice(0, 1).toUpperCase()}</Text>
    </span>
  )
}

function AccountRailItem({ account, isActive, onSelect }: {
  account: BrowserAccount
  isActive: boolean
  onSelect: () => void
}): React.JSX.Element {
  const color = `hsl(${account.colorHue} 55% 52%)`
  return (
    <Button
      variant="ghost"
      size="none"
      onClick={onSelect}
      aria-label={`Switch to ${account.name}`}
      aria-pressed={isActive}
      className="relative h-10 w-10 rounded-lg hover:bg-[var(--app-control-hover)]"
      style={isActive ? { background: `color-mix(in srgb, ${color} 16%, transparent)` } : undefined}
    >
      <span className="rounded-full p-0.5" style={isActive ? { boxShadow: `0 0 0 2px ${color}` } : undefined}>
        <AccountAvatar account={account} size={28} />
      </span>
      {account.requirePassword && (
        <span className="absolute bottom-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--app-bg-secondary)] text-[hsl(38_50%_50%)] ring-1 ring-[var(--app-separator)]">
          <SvgIcon svg={lockSvg} size={9} />
        </span>
      )}
    </Button>
  )
}

function SpaceRow({ space, tabCount, isActive, onSelect, onMoveTab, onDelete }: {
  space: AccountSpace
  tabCount: number
  isActive: boolean
  onSelect: () => void
  onMoveTab: () => void
  onDelete: () => void
}): React.JSX.Element {
  const color = space.hue >= 0 ? `hsl(${space.hue} 55% 55%)` : 'var(--app-text-tertiary)'
  return (
    <Button
      variant="ghost"
      size="none"
      active={isActive}
      onClick={onSelect}
      aria-pressed={isActive}
      className="group h-11 w-full justify-start gap-2 rounded-lg px-2.5 text-left hover:bg-[var(--app-control-hover)] data-[active=true]:bg-[var(--app-accent-bg)]"
    >
      <span className="h-7 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--app-bg-tertiary)]" style={{ color }}>
        <SvgIcon svg={boxSvg} size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <Text as="span" size="caption" tone="primary" className="block truncate font-medium">{space.name}</Text>
        <Text as="span" size="caption" tone="muted" className="block tabular-nums">{tabCount} {tabCount === 1 ? 'tab' : 'tabs'}</Text>
      </span>
      {isActive ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--app-accent)]">
          <SvgIcon svg={checkSvg} size={14} />
        </span>
      ) : (
        <Button variant="ghost" size="none" onClick={(e) => { e.stopPropagation(); onMoveTab() }} aria-label={`Move current tab to ${space.name}`} className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
          <SvgIcon svg={rightSmallSvg} size={14} />
        </Button>
      )}
      {space.id !== DEFAULT_SPACE_ID && (
        <Button variant="ghost" size="none" onClick={(e) => { e.stopPropagation(); onDelete() }} aria-label={`Delete ${space.name}`} className="h-7 w-7 shrink-0 text-[var(--app-text-tertiary)] opacity-0 hover:text-[var(--app-danger)] group-hover:opacity-100 group-focus-within:opacity-100">
          <SvgIcon svg={trashSvg} size={13} />
        </Button>
      )}
    </Button>
  )
}

function SpaceSwitcherInner(): React.JSX.Element {
  const [mode, setMode] = useState<'list' | 'new-account' | 'new-space' | 'edit-account' | 'password'>('list')
  const [draftName, setDraftName] = useState('')
  const [draftPassword, setDraftPassword] = useState('')
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { accounts, accountOrder, activeAccountId } = useAccountStore(useShallow((s) => ({
    accounts: s.accounts,
    accountOrder: s.accountOrder,
    activeAccountId: s.activeAccountId,
  })))
  const store = useAccountStore()
  const tabs = useTabStore((s) => s.tabs)
  const activeAccount = accounts[activeAccountId]
  const activeSpace = activeAccount?.spaces[activeAccount.activeSpaceId]
  const { isOpen, setOpen } = useUIStore(useShallow((s) => ({ isOpen: s.isSpaceSwitcherOpen, setOpen: s.setSpaceSwitcherOpen })))
  const { disableAnimations, uiLayout } = useSettingsStore(useShallow((s) => ({ disableAnimations: s.disableAnimations, uiLayout: s.uiLayout })))
  const popoverBelow = uiLayout === 'classic'
  const { enterY, exitY } = getPopoverMotion(popoverBelow)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPopoverPos({
      left: clampPopoverLeft(rect, POPOVER_WIDTH),
      top: popoverBelow ? rect.bottom + 6 : rect.top - 430,
    })
  }, [isOpen, popoverBelow])

  useEffect(() => {
    if (!isOpen) {
      setMode('list')
      setDraftName('')
      setDraftPassword('')
      setAuthError(null)
      setPendingAccountId(null)
    }
  }, [isOpen])

  const close = useCallback(() => setOpen(false), [setOpen])

  const activateFirstTabInSpace = useCallback((accountId: string, spaceId: string) => {
    const account = useAccountStore.getState().accounts[accountId]
    const space = account?.spaces[spaceId]
    const tabStore = useTabStore.getState()
    const target = space?.activeTabId && tabStore.tabs[space.activeTabId]
      ? space.activeTabId
      : space?.tabIds.find((id) => tabStore.tabs[id])
    if (target && tabStore.tabs[target]) tabStore.setActiveTab(target)
    else tabStore.addTab()
  }, [])

  const switchToAccount = useCallback((accountId: string) => {
    const account = accounts[accountId]
    if (!account) return
    store.switchAccount(accountId)
    if (useAccountStore.getState().activeAccountId !== accountId) return
    activateFirstTabInSpace(accountId, account.activeSpaceId)
    close()
  }, [accounts, activateFirstTabInSpace, close, store])

  const requestAccountSwitch = useCallback((accountId: string) => {
    const account = accounts[accountId]
    if (!account) return
    if (account.id !== activeAccountId && account.requirePassword && account.passwordHash && !useAccountStore.getState().unlockedAccountIds.includes(account.id)) {
      setPendingAccountId(accountId)
      setDraftPassword('')
      setAuthError(null)
      setMode('password')
      return
    }
    switchToAccount(accountId)
  }, [accounts, activeAccountId, switchToAccount])

  const selectSpace = useCallback((spaceId: string) => {
    if (!activeAccount) return
    store.switchSpace(spaceId)
    activateFirstTabInSpace(activeAccount.id, spaceId)
    close()
  }, [activeAccount, activateFirstTabInSpace, close, store])

  const moveActiveTab = useCallback((spaceId: string) => {
    const tabId = useTabStore.getState().activeTabId
    if (!tabId || !activeAccount) return
    store.moveTabToSpace(tabId, spaceId)
    useTabStore.getState().updateTab(tabId, { accountId: activeAccount.id, spaceId })
  }, [activeAccount, store])

  const handleAvatarFile = useCallback((file: File | undefined) => {
    if (!file || !activeAccount) return
    const reader = new FileReader()
    reader.onload = () => store.setAccountAvatar(activeAccount.id, typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)
  }, [activeAccount, store])

  const activeColor = activeAccount ? `hsl(${activeAccount.colorHue} 55% 52%)` : 'var(--app-accent)'

  return (
    <div className={`relative ${popoverBelow ? '' : 'h-full'}`} ref={triggerRef}>
      <Button
        variant="ghost"
        size="none"
        onClick={() => setOpen(!isOpen)}
        aria-label={activeAccount && activeSpace ? `Switch profile or space (${activeAccount.name}, ${activeSpace.name})` : 'Switch profile or space'}
        whileTap={disableAnimations ? undefined : { scale: 0.9 }}
        transition={disableAnimations ? { duration: 0 } : SPRING_SNAPPY}
        className={`${popoverBelow ? 'h-9 w-9' : 'h-8 w-8'} rounded-lg hover:bg-[var(--app-control-hover)]`}
      >
        {activeAccount ? <AccountAvatar account={activeAccount} size={22} /> : <SvgIcon svg={personSvg} size={16} />}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[99]" onMouseDown={close} />
            <m.div
              className="fixed z-[100] w-[360px]"
              style={{ left: popoverPos?.left, top: popoverPos?.top, originX: 0.5, originY: popoverBelow ? 0 : 1 }}
              initial={disableAnimations ? undefined : { scale: 0.98, opacity: 0, y: enterY }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={disableAnimations ? undefined : { scale: 0.98, opacity: 0, y: exitY }}
              transition={disableAnimations ? { duration: 0 } : { duration: 0.12, ease: 'easeOut' }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="overflow-hidden rounded-xl border border-[var(--app-separator)] bg-[var(--app-bg-secondary)] p-2 text-[var(--app-text-primary)] shadow-sm">
                {mode === 'password' && pendingAccountId ? (
                  <div className="space-y-3 p-2">
                    <div className="flex items-center gap-2">
                      {accounts[pendingAccountId] && <AccountAvatar account={accounts[pendingAccountId]} size={32} />}
                      <div className="min-w-0">
                        <Text size="label" tone="primary" className="truncate">Unlock {accounts[pendingAccountId]?.name}</Text>
                        <Text size="caption" tone="muted">Password required</Text>
                      </div>
                    </div>
                    <TextInput type="password" value={draftPassword} onChange={(e) => { setDraftPassword(e.target.value); setAuthError(null) }} placeholder="Password" inputSize="sm" autoFocus />
                    {authError && <Text size="caption" tone="danger">{authError}</Text>}
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" disabled={!draftPassword.trim()} onClick={async () => {
                        const account = accounts[pendingAccountId]
                        if (account && await verifyAccountPassword(draftPassword, account.passwordHash)) {
                          store.unlockAccount(account.id)
                          switchToAccount(account.id)
                        } else {
                          setAuthError('Password is incorrect')
                        }
                      }}>Unlock</Button>
                      <Button variant="ghost" size="sm" onClick={() => setMode('list')}>Cancel</Button>
                    </div>
                  </div>
                ) : mode === 'edit-account' && activeAccount ? (
                  <div className="space-y-3 p-2">
                    <div className="flex items-center gap-3">
                      <AccountAvatar account={activeAccount} size={46} />
                      <TextInput value={draftName || activeAccount.name} onChange={(e) => setDraftName(e.target.value)} inputSize="sm" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SPACE_PRESET_HUES.filter((item) => item.hue >= 0).map((item) => (
                        <Button key={item.hue} variant="ghost" size="none" aria-label={item.label} onClick={() => store.setAccountColor(activeAccount.id, item.hue)} className="h-7 w-7 rounded-full ring-offset-1 ring-offset-[var(--app-bg-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]" style={{ background: `hsl(${item.hue} 55% 55%)`, boxShadow: activeAccount.colorHue === item.hue ? '0 0 0 2px var(--app-accent)' : undefined }} />
                      ))}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarFile(e.target.files?.[0])} />
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="subtle" size="sm" onClick={() => fileInputRef.current?.click()}>Profile picture</Button>
                      <Button variant="subtle" size="sm" onClick={() => store.setAccountAvatar(activeAccount.id, null)}>Remove picture</Button>
                      <Button variant="primary" size="sm" onClick={() => { store.renameAccount(activeAccount.id, (draftName || activeAccount.name).trim()); setMode('list') }}>Save</Button>
                      {activeAccount.id !== DEFAULT_ACCOUNT_ID && <Button variant="danger" size="sm" onClick={() => { store.removeAccount(activeAccount.id); setMode('list') }}>Delete</Button>}
                    </div>
                  </div>
                ) : mode === 'new-account' || mode === 'new-space' ? (
                  <div className="space-y-3 p-2">
                    <TextInput value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder={mode === 'new-account' ? 'Account name' : 'Space name'} inputSize="sm" autoFocus />
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" disabled={!draftName.trim()} onClick={() => {
                        if (mode === 'new-account') requestAccountSwitch(store.addAccount(draftName))
                        else selectSpace(store.addSpace(draftName, 145))
                        setDraftName('')
                      }}>{mode === 'new-account' ? 'Create account' : 'Add space'}</Button>
                      <Button variant="ghost" size="sm" onClick={() => setMode('list')}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-[var(--app-bg-tertiary)] p-1">
                      {accountOrder.map((id) => {
                        const account = accounts[id]
                        if (!account) return null
                        return <AccountRailItem key={id} account={account} isActive={id === activeAccountId} onSelect={() => requestAccountSwitch(id)} />
                      })}
                      <Button variant="ghost" size="none" onClick={() => setMode('new-account')} aria-label="New account" className="h-10 w-10 shrink-0 rounded-lg text-[var(--app-text-secondary)]">
                        <SvgIcon svg={plusSvg} size={14} />
                      </Button>
                    </div>

                    {activeAccount && (
                      <>
                        <div className="flex items-center justify-between px-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <AccountAvatar account={activeAccount} size={28} />
                            <div className="min-w-0">
                              <Text size="caption" tone="primary" className="truncate font-semibold" style={{ color: activeColor }}>{activeAccount.name}</Text>
                              <Text size="caption" tone="muted" className="truncate">{activeSpace?.name ?? 'No space selected'}</Text>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="xs" onClick={() => { setDraftName(activeAccount.name); setMode('edit-account') }} aria-label="Edit account"><SvgIcon svg={pencilSvg} size={12} /> Edit</Button>
                            <Button variant="ghost" size="xs" onClick={() => setMode('new-space')} aria-label="Add space"><SvgIcon svg={plusSvg} size={12} /> Space</Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {activeAccount.spaceOrder.map((spaceId) => {
                            const space = activeAccount.spaces[spaceId]
                            if (!space) return null
                            const tabCount = space.tabIds.reduce((count, id) => count + (tabs[id] ? 1 : 0), 0)
                            return <SpaceRow key={space.id} space={space} tabCount={tabCount} isActive={space.id === activeAccount.activeSpaceId} onSelect={() => selectSpace(space.id)} onMoveTab={() => moveActiveTab(space.id)} onDelete={() => store.removeSpace(space.id)} />
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export const SpaceSwitcher = memo(SpaceSwitcherInner)
