import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { GroupBox } from '@/components/ui/GroupBox'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { TextInput } from '@/components/ui/Input'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { useAccountStore, DEFAULT_ACCOUNT_ID, DEFAULT_SPACE_ID, type AccountSpace, type BrowserAccount } from '@/store/accountStore'
import { useTabStore } from '@/store/tabStore'
import { SPACE_PRESET_HUES } from '@/store/spaceStore'
import { hashAccountPassword, verifyAccountPassword } from '@/utils/accountSecurity'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import checkSvg from '@/assets/icons/Interface/Check.svg?raw'
import pencilSvg from '@/assets/icons/Objects/Pencil.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import lockSvg from '@/assets/icons/Objects/Lock.svg?raw'
import lockOpenSvg from '@/assets/icons/Objects/Lock_Open.svg?raw'
import imageSvg from '@/assets/icons/News/Image_Picture.svg?raw'

function AccountAvatar({ account, size = 34 }: { account: BrowserAccount; size?: number }): React.JSX.Element {
  const style = { width: size, height: size, background: `hsl(${account.colorHue} 55% 52%)` }
  return account.avatarDataUrl ? (
    <img src={account.avatarDataUrl} alt="" draggable={false} className="shrink-0 rounded-full object-cover" style={style} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full text-white shadow-sm" style={style}>
      <Text as="span" size="caption" className="text-white">{account.name.slice(0, 1).toUpperCase()}</Text>
    </span>
  )
}

function AccountListItem({ account, isActive, isSelected, onSelect }: {
  account: BrowserAccount
  isActive: boolean
  isSelected: boolean
  onSelect: () => void
}): React.JSX.Element {
  const color = `hsl(${account.colorHue} 55% 52%)`
  return (
    <Button
      variant="subtle"
      size="none"
      onClick={onSelect}
      aria-pressed={isSelected}
      className="h-12 w-full justify-start gap-2 rounded-lg px-2 text-left hover:bg-[var(--app-control-hover)] data-[active=true]:bg-[var(--app-accent-bg)]"
      active={isSelected}
    >
      <span className="rounded-full p-0.5" style={isSelected ? { boxShadow: `0 0 0 2px ${color}` } : undefined}>
        <AccountAvatar account={account} size={32} />
      </span>
      <span className="min-w-0 flex-1">
        <Text as="span" size="caption" tone="primary" className="block truncate font-medium">{account.name}</Text>
        <Text as="span" size="caption" tone={isActive ? 'accent' : 'muted'} className="block truncate">{isActive ? 'Active' : account.requirePassword ? 'Locked' : 'Ready'}</Text>
      </span>
      {account.requirePassword && <SvgIcon svg={lockSvg} size={12} className="shrink-0 text-[var(--app-text-tertiary)]" />}
    </Button>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="rounded-xl bg-[var(--app-grouped-bg-secondary)] p-3">
      <Text size="label" tone="primary" className="mb-3 font-semibold">{title}</Text>
      {children}
    </section>
  )
}

function SpaceDetailRow({ space, tabCount, isActive, canEdit, isEditing, draftName, onDraftName, onStartEdit, onSaveEdit, onCancelEdit, onSwitch, onDelete }: {
  space: AccountSpace
  tabCount: number
  isActive: boolean
  canEdit: boolean
  isEditing: boolean
  draftName: string
  onDraftName: (value: string) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onSwitch: () => void
  onDelete: () => void
}): React.JSX.Element {
  const color = space.hue >= 0 ? `hsl(${space.hue} 55% 55%)` : 'var(--app-text-tertiary)'
  return (
    <div className="group flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-[var(--app-control-hover)] focus-within:bg-[var(--app-control-hover)]">
      <span className="h-7 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      {isEditing ? (
        <>
          <TextInput
            value={draftName}
            onChange={(event) => onDraftName(event.target.value)}
            inputSize="sm"
            className="min-w-0 flex-1"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSaveEdit()
              if (event.key === 'Escape') onCancelEdit()
            }}
          />
          <Button variant="primary" size="xs" disabled={!draftName.trim()} onClick={onSaveEdit}>Save</Button>
          <Button variant="ghost" size="xs" onClick={onCancelEdit}>Cancel</Button>
        </>
      ) : (
        <>
          <button type="button" onClick={onSwitch} disabled={!canEdit} className="min-w-0 flex-1 text-left disabled:pointer-events-none">
            <Text size="caption" tone="primary" className="truncate font-medium">{space.name}</Text>
            <Text size="caption" tone="muted" className="tabular-nums">{tabCount} {tabCount === 1 ? 'tab' : 'tabs'}</Text>
          </button>
          {isActive && (
            <span className="flex h-7 items-center gap-1 rounded-full px-2 text-[var(--app-accent)]">
              <SvgIcon svg={checkSvg} size={12} />
              <Text as="span" size="caption" tone="accent">Active</Text>
            </span>
          )}
          {canEdit && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
              <Button variant="ghost" size="none" aria-label={`Rename ${space.name}`} onClick={onStartEdit} className="h-7 w-7">
                <SvgIcon svg={pencilSvg} size={12} />
              </Button>
              {space.id !== DEFAULT_SPACE_ID && (
                <Button variant="ghost" size="none" aria-label={`Delete ${space.name}`} onClick={onDelete} className="h-7 w-7 text-[var(--app-text-tertiary)] hover:text-[var(--app-danger)]">
                  <SvgIcon svg={trashSvg} size={12} />
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AccountsPaneInner(): React.JSX.Element {
  const { accounts, accountOrder, activeAccountId, unlockedAccountIds } = useAccountStore(useShallow((s) => ({
    accounts: s.accounts,
    accountOrder: s.accountOrder,
    activeAccountId: s.activeAccountId,
    unlockedAccountIds: s.unlockedAccountIds,
  })))
  const store = useAccountStore()
  const tabs = useTabStore((s) => s.tabs)
  const [selectedAccountId, setSelectedAccountId] = useState(activeAccountId)
  const [newAccountName, setNewAccountName] = useState('')
  const [profileName, setProfileName] = useState('')
  const [newSpaceName, setNewSpaceName] = useState('')
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)
  const [editingSpaceName, setEditingSpaceName] = useState('')
  const [passwordDraft, setPasswordDraft] = useState('')
  const [unlockDraft, setUnlockDraft] = useState('')
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedAccount = accounts[selectedAccountId] ?? accounts[activeAccountId]
  const isSelectedActive = selectedAccount?.id === activeAccountId
  const requiresUnlock = Boolean(selectedAccount && selectedAccount.id !== activeAccountId && selectedAccount.requirePassword && selectedAccount.passwordHash && !unlockedAccountIds.includes(selectedAccount.id))

  useEffect(() => {
    setSelectedAccountId(activeAccountId)
  }, [activeAccountId])

  useEffect(() => {
    setProfileName(selectedAccount?.name ?? '')
    setPasswordDraft('')
    setUnlockDraft('')
    setUnlockError(null)
    setEditingSpaceId(null)
  }, [selectedAccount?.id, selectedAccount?.name])

  const switchOrUnlockAccount = useCallback((account: BrowserAccount) => {
    setSelectedAccountId(account.id)
    if (account.id === activeAccountId) return
    if (account.requirePassword && account.passwordHash && !unlockedAccountIds.includes(account.id)) return
    store.switchAccount(account.id)
  }, [activeAccountId, store, unlockedAccountIds])

  const unlockSelected = useCallback(async () => {
    if (!selectedAccount?.passwordHash) return
    if (await verifyAccountPassword(unlockDraft, selectedAccount.passwordHash)) {
      store.unlockAccount(selectedAccount.id)
      store.switchAccount(selectedAccount.id)
      setUnlockDraft('')
      setUnlockError(null)
    } else {
      setUnlockError('Password is incorrect')
    }
  }, [selectedAccount, store, unlockDraft])

  const saveProfile = useCallback(() => {
    if (!selectedAccount || !isSelectedActive || !profileName.trim()) return
    store.renameAccount(selectedAccount.id, profileName.trim())
  }, [isSelectedActive, profileName, selectedAccount, store])

  const handleAvatarFile = useCallback((file: File | undefined) => {
    if (!file || !selectedAccount || !isSelectedActive) return
    const reader = new FileReader()
    reader.onload = () => store.setAccountAvatar(selectedAccount.id, typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)
  }, [isSelectedActive, selectedAccount, store])

  const addSpace = useCallback(() => {
    if (!newSpaceName.trim() || !isSelectedActive) return
    store.addSpace(newSpaceName.trim(), 145)
    setNewSpaceName('')
  }, [isSelectedActive, newSpaceName, store])

  if (!selectedAccount) return <></>

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <GroupBox title="Accounts" desc="Switch profiles and keep site data separate." contentClassName="space-y-3">
        <div className="space-y-1">
          {accountOrder.map((id) => {
            const account = accounts[id]
            if (!account) return null
            return (
              <AccountListItem
                key={id}
                account={account}
                isActive={id === activeAccountId}
                isSelected={id === selectedAccount.id}
                onSelect={() => switchOrUnlockAccount(account)}
              />
            )
          })}
        </div>
        <div className="flex gap-2">
          <TextInput
            value={newAccountName}
            onChange={(event) => setNewAccountName(event.target.value)}
            placeholder="Account name"
            inputSize="sm"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && newAccountName.trim()) {
                const id = store.addAccount(newAccountName)
                setSelectedAccountId(id)
                setNewAccountName('')
              }
            }}
          />
          <Button
            variant="primary"
            size="none"
            disabled={!newAccountName.trim()}
            onClick={() => {
              const id = store.addAccount(newAccountName)
              setSelectedAccountId(id)
              setNewAccountName('')
            }}
            aria-label="New account"
            className="h-8 w-8 shrink-0"
          >
            <SvgIcon svg={plusSvg} size={13} />
          </Button>
        </div>
      </GroupBox>

      <div className="space-y-4">
        {requiresUnlock ? (
          <GroupBox>
            <div className="flex items-center gap-3">
              <AccountAvatar account={selectedAccount} size={44} />
              <div className="min-w-0 flex-1">
                <Text size="label" tone="primary" className="truncate font-semibold">Unlock {selectedAccount.name}</Text>
                <Text size="caption" tone="muted">Enter the password to switch accounts.</Text>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <TextInput
                type="password"
                value={unlockDraft}
                onChange={(event) => { setUnlockDraft(event.target.value); setUnlockError(null) }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void unlockSelected()
                }}
                placeholder="Password"
                inputSize="sm"
              />
              <Button variant="primary" size="sm" disabled={!unlockDraft.trim()} onClick={() => void unlockSelected()}>Unlock</Button>
            </div>
            {unlockError && <Text size="caption" tone="danger" className="mt-2">{unlockError}</Text>}
          </GroupBox>
        ) : !isSelectedActive ? (
          <GroupBox>
            <div className="flex items-center gap-3">
              <AccountAvatar account={selectedAccount} size={44} />
              <div className="min-w-0 flex-1">
                <Text size="label" tone="primary" className="truncate font-semibold">{selectedAccount.name}</Text>
                <Text size="caption" tone="muted">Switch to manage this account.</Text>
              </div>
              <Button variant="primary" size="sm" onClick={() => store.switchAccount(selectedAccount.id)}>Switch</Button>
            </div>
          </GroupBox>
        ) : (
          <>
            <DetailSection title="Profile">
              <div className="flex flex-wrap items-center gap-3">
                <AccountAvatar account={selectedAccount} size={52} />
                <div className="min-w-[180px] flex-1">
                  <TextInput
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') saveProfile()
                    }}
                    placeholder="Account name"
                    inputSize="sm"
                  />
                </div>
                <Button variant="primary" size="sm" disabled={!profileName.trim() || profileName.trim() === selectedAccount.name} onClick={saveProfile}>Save</Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {SPACE_PRESET_HUES.filter((item) => item.hue >= 0).map((item) => (
                  <Button
                    key={item.hue}
                    variant="ghost"
                    size="none"
                    aria-label={item.label}
                    onClick={() => store.setAccountColor(selectedAccount.id, item.hue)}
                    className="h-7 w-7 rounded-full"
                    style={{ background: `hsl(${item.hue} 55% 55%)`, boxShadow: selectedAccount.colorHue === item.hue ? '0 0 0 2px var(--app-accent)' : undefined }}
                  />
                ))}
                <span className="mx-1 h-5 w-px bg-[var(--app-separator)]" />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleAvatarFile(event.target.files?.[0])} />
                <Button variant="subtle" size="sm" onClick={() => fileInputRef.current?.click()}><SvgIcon svg={imageSvg} size={13} /> Picture</Button>
                <Button variant="danger" size="sm" onClick={() => store.setAccountAvatar(selectedAccount.id, null)}>Remove picture</Button>
                {selectedAccount.id !== DEFAULT_ACCOUNT_ID && (
                  <Button variant="danger" size="sm" onClick={() => store.removeAccount(selectedAccount.id)}>Delete account</Button>
                )}
              </div>
            </DetailSection>

            <DetailSection title="Spaces">
              <div className="space-y-1">
                {selectedAccount.spaceOrder.map((spaceId) => {
                  const space = selectedAccount.spaces[spaceId]
                  if (!space) return null
                  const tabCount = space.tabIds.reduce((count, id) => count + (tabs[id] ? 1 : 0), 0)
                  return (
                    <SpaceDetailRow
                      key={space.id}
                      space={space}
                      tabCount={tabCount}
                      isActive={space.id === selectedAccount.activeSpaceId}
                      canEdit={isSelectedActive}
                      isEditing={editingSpaceId === space.id}
                      draftName={editingSpaceName}
                      onDraftName={setEditingSpaceName}
                      onStartEdit={() => { setEditingSpaceId(space.id); setEditingSpaceName(space.name) }}
                      onSaveEdit={() => {
                        if (!editingSpaceName.trim()) return
                        store.renameSpace(space.id, editingSpaceName.trim())
                        setEditingSpaceId(null)
                      }}
                      onCancelEdit={() => setEditingSpaceId(null)}
                      onSwitch={() => {
                        store.switchSpace(space.id)
                        const target = space.activeTabId && tabs[space.activeTabId] ? space.activeTabId : space.tabIds.find((id) => tabs[id])
                        if (target && tabs[target]) useTabStore.getState().setActiveTab(target)
                      }}
                      onDelete={() => store.removeSpace(space.id)}
                    />
                  )
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <TextInput
                  value={newSpaceName}
                  onChange={(event) => setNewSpaceName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addSpace()
                  }}
                  placeholder="Space name"
                  inputSize="sm"
                />
                <Button variant="primary" size="sm" disabled={!newSpaceName.trim()} onClick={addSpace}>Add space</Button>
              </div>
            </DetailSection>

            <DetailSection title="Security">
              <div className="flex flex-wrap items-center gap-2">
                <TextInput
                  type="password"
                  value={passwordDraft}
                  onChange={(event) => setPasswordDraft(event.target.value)}
                  placeholder={selectedAccount.passwordHash ? 'New password' : 'Password'}
                  inputSize="sm"
                  className="max-w-[220px]"
                />
                <Button
                  variant="subtle"
                  size="sm"
                  disabled={!passwordDraft.trim()}
                  onClick={async () => {
                    store.setAccountPassword(selectedAccount.id, await hashAccountPassword(passwordDraft.trim()))
                    setPasswordDraft('')
                  }}
                >
                  Set password
                </Button>
                <Button
                  variant={selectedAccount.requirePassword ? 'solid' : 'subtle'}
                  size="sm"
                  disabled={!selectedAccount.passwordHash}
                  aria-pressed={selectedAccount.requirePassword}
                  aria-label={selectedAccount.requirePassword ? 'Password protection enabled' : 'Password protection disabled'}
                  onClick={() => store.setRequirePassword(selectedAccount.id, !selectedAccount.requirePassword)}
                  style={{ width: 128, flexShrink: 0 }}
                  className={`justify-start ${selectedAccount.requirePassword ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-secondary)]'}`}
                >
                  <SvgIcon svg={selectedAccount.requirePassword ? lockSvg : lockOpenSvg} size={13} />
                  <span className="min-w-0 flex-1 text-left">
                    {selectedAccount.passwordHash ? (selectedAccount.requirePassword ? 'Password on' : 'Password off') : 'No password'}
                  </span>
                </Button>
              </div>
            </DetailSection>
          </>
        )}
      </div>
    </div>
  )
}

export const AccountsPane = memo(AccountsPaneInner)
