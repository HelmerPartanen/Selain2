import { memo, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { TextInput } from '@/components/ui/Input'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { useAccountStore, type BrowserAccount } from '@/store/accountStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTabStore } from '@/store/tabStore'
import { verifyAccountPassword } from '@/utils/accountSecurity'
import { WindowControls } from '@/components/layout/WindowControls'
import lockSvg from '@/assets/icons/Objects/Lock.svg?raw'

function AccountAvatar({ account, size = 32 }: { account: BrowserAccount; size?: number }): React.JSX.Element {
  const style = { width: size, height: size, background: `hsl(${account.colorHue} 55% 52%)` }
  return account.avatarDataUrl ? (
    <img src={account.avatarDataUrl} alt="" draggable={false} className="shrink-0 rounded-full object-cover" style={style} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full text-white shadow-sm" style={style}>
      <Text as="span" size="caption" className="text-white">{account.name.slice(0, 1).toUpperCase()}</Text>
    </span>
  )
}

function AccountLockOverlayInner(): React.JSX.Element | null {
  const accounts = useAccountStore((s) => s.accounts)
  const accountOrder = useAccountStore((s) => s.accountOrder)
  const activeAccountId = useAccountStore((s) => s.activeAccountId)
  const activeAccount = accounts[activeAccountId]
  const unlockedAccountIds = useAccountStore((s) => s.unlockedAccountIds)
  const unlockAccount = useAccountStore((s) => s.unlockAccount)
  const switchAccount = useAccountStore((s) => s.switchAccount)
  const uiLayout = useSettingsStore((s) => s.uiLayout)
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)
  const [selectedAccountId, setSelectedAccountId] = useState(activeAccountId)
  const [unlockAccountId, setUnlockAccountId] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const selectedAccount = accounts[selectedAccountId] ?? activeAccount
  const unlockAccountTarget = unlockAccountId ? accounts[unlockAccountId] : null
  const selectedRequiresPassword = Boolean(unlockAccountTarget?.requirePassword && unlockAccountTarget.passwordHash && !unlockedAccountIds.includes(unlockAccountTarget.id))
  const overlayTop = uiLayout === 'classic' ? 0 : 40

  useEffect(() => {
    setSelectedAccountId(activeAccountId)
    setUnlockAccountId(null)
    setPassword('')
    setError(null)
  }, [activeAccountId])

  const activateFirstTabInAccount = useCallback((account: BrowserAccount) => {
    const space = account.spaces[account.activeSpaceId]
    const tabStore = useTabStore.getState()
    const target = space?.activeTabId && tabStore.tabs[space.activeTabId]
      ? space.activeTabId
      : space?.tabIds.find((id) => tabStore.tabs[id])
    if (target && tabStore.tabs[target]) tabStore.setActiveTab(target)
    else tabStore.addTab()
  }, [])

  const switchToAccount = useCallback((account: BrowserAccount) => {
    switchAccount(account.id)
    if (useAccountStore.getState().activeAccountId === account.id) {
      activateFirstTabInAccount(account)
    }
  }, [activateFirstTabInAccount, switchAccount])

  const unlockSelectedAccount = useCallback(async () => {
    if (!unlockAccountTarget?.passwordHash) return
    if (await verifyAccountPassword(password, unlockAccountTarget.passwordHash)) {
      unlockAccount(unlockAccountTarget.id)
      switchToAccount(unlockAccountTarget)
      setPassword('')
      setError(null)
      setUnlockAccountId(null)
    } else {
      setError('Password is incorrect')
    }
  }, [password, switchToAccount, unlockAccount, unlockAccountTarget])

  if (!activeAccount?.requirePassword || !activeAccount.passwordHash || unlockedAccountIds.includes(activeAccount.id)) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[300] flex items-center justify-center bg-[var(--app-bg-primary)]/80 backdrop-blur-2xl px-6" style={{ top: overlayTop }}>
      {uiLayout === 'classic' && (
        <div className="absolute right-0 top-0 [app-region:no-drag]">
          <WindowControls embedded />
        </div>
      )}
      <div className="w-full max-w-[520px] flex flex-col items-center justify-center">
        <Text size="title" tone="primary" className="font-semibold !text-[22px]">Choose account</Text>
        <Text size="caption" tone="muted" className="mt-1">Unlock this profile or switch to another account.</Text>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {accountOrder.map((id) => {
            const account = accounts[id]
            if (!account) return null
            const isSelected = selectedAccount?.id === account.id
            const isLocked = account.requirePassword && account.passwordHash && !unlockedAccountIds.includes(account.id)
            const color = `hsl(${account.colorHue} 55% 52%)`
            return (
              <Button
                key={id}
                variant="ghost"
                size="none"
                active={isSelected}
                onClick={() => {
                  setSelectedAccountId(account.id)
                  setPassword('')
                  setError(null)
                  if (isLocked) {
                    setUnlockAccountId(account.id)
                  } else {
                    setUnlockAccountId(null)
                    switchToAccount(account)
                  }
                }}
                className="h-14 justify-start gap-2 rounded-lg p-2 text-left data-[active=true]:bg-[var(--app-accent-bg)]"
                style={isSelected ? { boxShadow: `inset 0 0 0 1px ${color}` } : undefined}
              >
                <AccountAvatar account={account} size={34} />
                <span className="min-w-0 flex-1">
                  <Text as="span" size="caption" tone="primary" className="block truncate font-medium">{account.name}</Text>
                  <Text as="span" size="caption" tone={account.id === activeAccountId ? 'accent' : 'muted'} className="block truncate">
                    {account.id === activeAccountId ? 'Current' : isLocked ? 'Locked' : 'Switch'}
                  </Text>
                </span>
                {isLocked && <SvgIcon svg={lockSvg} size={12} className="text-[hsl(38_50%_50%)]" />}
              </Button>
            )
          })}
        </div>

        <AnimatePresence initial={false}>
          {unlockAccountTarget && selectedRequiresPassword && (
            <m.div
              key={unlockAccountTarget.id}
              className="mt-4 w-full max-w-xs space-y-2"
              initial={disableAnimations ? undefined : { opacity: 0, y: -8, scale: 0.98, height: 0 }}
              animate={{ opacity: 1, y: 0, scale: 1, height: 'auto' }}
              exit={disableAnimations ? undefined : { opacity: 0, y: -6, scale: 0.98, height: 0 }}
              transition={disableAnimations ? { duration: 0 } : { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ overflow: 'visible' }}
            >
              <Text size="label" tone="primary">Unlock {unlockAccountTarget.name}</Text>
              <TextInput
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void unlockSelectedAccount()
                }}
                placeholder="Password"
                autoFocus
              />
              {error && <Text size="caption" tone="danger">{error}</Text>}
              <Button
                variant="primary"
                size="md"
                className="w-full"
                disabled={!password.trim()}
                onClick={() => void unlockSelectedAccount()}
              >
                Unlock
              </Button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export const AccountLockOverlay = memo(AccountLockOverlayInner)
