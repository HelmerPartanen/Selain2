import { memo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { GroupBox } from '@/components/ui/GroupBox'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { TextInput } from '@/components/ui/Input'
import { SettingGroup, SettingRow } from '@/settings/components/SettingsShared'
import { useAccountStore, DEFAULT_ACCOUNT_ID } from '@/store/accountStore'

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
  const [draftName, setDraftName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

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
                desc={`${spaceCount} ${spaceCount === 1 ? 'space' : 'spaces'} - ${account.partitionId}`}
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
                        <Button variant="subtle" size="xs" onClick={() => switchAccount(id)}>Switch</Button>
                      )}
                      <Button
                        variant="subtle"
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
