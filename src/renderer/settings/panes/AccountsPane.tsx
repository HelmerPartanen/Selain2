import { memo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { GroupBox } from '@/components/ui/GroupBox'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { TextInput } from '@/components/ui/Input'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { SettingGroup, SettingRow } from '@/settings/components/SettingsShared'
import { useAccountStore, DEFAULT_ACCOUNT_ID } from '@/store/accountStore'
import { hashAccountPassword } from '@/utils/accountSecurity'
import lockSvg from '@/assets/icons/Objects/Lock.svg?raw'
import lockOpenSvg from '@/assets/icons/Objects/Lock_Open.svg?raw'

function AccountsPaneInner(): React.JSX.Element {
  const { accounts, accountOrder, activeAccountId } = useAccountStore(useShallow((s) => ({
    accounts: s.accounts,
    accountOrder: s.accountOrder,
    activeAccountId: s.activeAccountId,
  })))
  const addAccount = useAccountStore((s) => s.addAccount)
  const renameAccount = useAccountStore((s) => s.renameAccount)
  const removeAccount = useAccountStore((s) => s.removeAccount)
  const switchAccount = useAccountStore((s) => s.switchAccount)
  const setAccountPassword = useAccountStore((s) => s.setAccountPassword)
  const setRequirePassword = useAccountStore((s) => s.setRequirePassword)
  const [draftName, setDraftName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [passwordDraftById, setPasswordDraftById] = useState<Record<string, string>>({})

  return (
    <div className="space-y-7">
      <GroupBox
        title="Accounts"
        desc="Each account has its own cookies, logins, permissions, cache, and site data."
      >
        <div className="flex gap-2">
          <TextInput
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Account name"
            inputSize="sm"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && draftName.trim()) {
                addAccount(draftName)
                setDraftName('')
              }
            }}
          />
          <Button
            variant="primary"
            size="md"
            disabled={!draftName.trim()}
            onClick={() => {
              addAccount(draftName)
              setDraftName('')
            }}
          >
            New account
          </Button>
        </div>
      </GroupBox>

      <GroupBox title="Account containers" desc="Spaces organize tabs inside the selected account.">
        <SettingGroup>
          {accountOrder.map((id) => {
            const account = accounts[id]
            if (!account) return null
            const isActive = id === activeAccountId
            const spaceCount = account.spaceOrder.length
            return (
              <SettingRow
                key={id}
                label={account.name}
                desc={`${spaceCount} ${spaceCount === 1 ? 'space' : 'spaces'}`}
              >
                <div className="flex items-center gap-2">
                  {editingId === id ? (
                    <>
                      <TextInput
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        inputSize="sm"
                        className="w-36"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && editingName.trim()) {
                            renameAccount(id, editingName.trim())
                            setEditingId(null)
                          }
                          if (event.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <Button
                        variant="primary"
                        size="xs"
                        disabled={!editingName.trim()}
                        onClick={() => {
                          renameAccount(id, editingName.trim())
                          setEditingId(null)
                        }}
                      >
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      {isActive ? (
                        <Text size="caption" tone="accent" className="whitespace-nowrap">Active</Text>
                      ) : (
                        <Button variant="ghost" size="xs" onClick={() => switchAccount(id)}>Switch</Button>
                      )}
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          setEditingId(id)
                          setEditingName(account.name)
                        }}
                      >
                        Rename
                      </Button>
                      {id !== DEFAULT_ACCOUNT_ID && (
                        <Button variant="danger" size="xs" onClick={() => removeAccount(id)}>
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                  {isActive ? (
                    <>
                      <TextInput
                        type="password"
                        value={passwordDraftById[id] ?? ''}
                        onChange={(event) => setPasswordDraftById((state) => ({ ...state, [id]: event.target.value }))}
                        placeholder={account.passwordHash ? 'New password' : 'Password'}
                        inputSize="sm"
                        className="w-32"
                      />
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={!(passwordDraftById[id] ?? '').trim()}
                        onClick={async () => {
                          setAccountPassword(id, await hashAccountPassword(passwordDraftById[id]!.trim()))
                          setPasswordDraftById((state) => ({ ...state, [id]: '' }))
                        }}
                      >
                        Set password
                      </Button>
                      <Button
                        variant={account.requirePassword ? 'solid' : 'ghost'}
                        size="xs"
                        disabled={!account.passwordHash}
                        aria-pressed={account.requirePassword}
                        aria-label={account.requirePassword ? 'Password protection enabled' : 'Password protection disabled'}
                        onClick={() => setRequirePassword(id, !account.requirePassword)}
                        style={{ width: 104, flexShrink: 0 }}
                        className={`justify-start ${account.requirePassword ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-secondary)]'}`}
                      >
                        <SvgIcon svg={account.requirePassword ? lockSvg : lockOpenSvg} size={12} />
                        <span className="min-w-0 flex-1 text-left">
                          {account.passwordHash ? (account.requirePassword ? 'Password on' : 'Password off') : 'No password'}
                        </span>
                      </Button>
                    </>
                  ) : (
                    <Text size="caption" tone="muted" className="whitespace-nowrap">Switch to manage password</Text>
                  )}
                </div>
              </SettingRow>
            )
          })}
        </SettingGroup>
      </GroupBox>
    </div>
  )
}

export const AccountsPane = memo(AccountsPaneInner)
