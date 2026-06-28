import { memo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { TextInput } from '@/components/ui/Input'
import { useAccountStore } from '@/store/accountStore'
import { verifyAccountPassword } from '@/utils/accountSecurity'

function AccountLockOverlayInner(): React.JSX.Element | null {
  const activeAccount = useAccountStore((s) => s.accounts[s.activeAccountId])
  const [unlockedAccountId, setUnlockedAccountId] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!activeAccount?.requirePassword || !activeAccount.passwordHash || unlockedAccountId === activeAccount.id) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[var(--app-bg-primary)]/95 px-6 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-xl border border-[var(--app-separator)] bg-[var(--app-bg-secondary)] p-5 shadow-sm">
        <Text size="title" tone="primary" className="font-semibold">Unlock {activeAccount.name}</Text>
        <Text size="caption" tone="muted" className="mt-1">This profile requires a password before browsing.</Text>
        <div className="mt-4 space-y-2">
          <TextInput
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError(null)
            }}
            onKeyDown={async (event) => {
              if (event.key === 'Enter' && await verifyAccountPassword(password, activeAccount.passwordHash)) {
                setUnlockedAccountId(activeAccount.id)
              } else if (event.key === 'Enter') {
                setError('Password is incorrect')
              }
            }}
            placeholder="Password"
            autoFocus
          />
          {error && <Text size="caption" tone="danger">{error}</Text>}
        </div>
        <Button
          variant="primary"
          size="md"
          className="mt-4 w-full"
          onClick={async () => {
            if (await verifyAccountPassword(password, activeAccount.passwordHash)) setUnlockedAccountId(activeAccount.id)
            else setError('Password is incorrect')
          }}
        >
          Unlock profile
        </Button>
      </div>
    </div>
  )
}

export const AccountLockOverlay = memo(AccountLockOverlayInner)
