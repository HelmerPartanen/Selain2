import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { TextInput } from '@/components/ui/Input'
import { SvgIcon } from '@/components/ui/SvgIcon'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import boxSvg from '@/assets/icons/Interface/Menu_Points_3.svg?raw'
import personSvg from '@/assets/icons/Human/Person_User.svg?raw'
import rightSmallSvg from '@/assets/icons/Arrows/Right_Small.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import { useAccountStore, DEFAULT_ACCOUNT_ID, DEFAULT_SPACE_ID, type AccountSpace } from '@/store/accountStore'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { SPACE_PRESET_HUES } from '@/store/spaceStore'
import { SPRING_SNAPPY } from '@/utils/springs'
import { clampPopoverLeft, clampPopoverTop, getPopoverMotion } from '@/utils/popoverPosition'

const POPOVER_WIDTH = 320
const POPOVER_ESTIMATED_HEIGHT = 430

function NameForm({
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  placeholder: string
  submitLabel: string
  onSubmit: (name: string, hue: number) => void
  onCancel: () => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [selectedHue, setSelectedHue] = useState(145)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = (): void => {
    const trimmed = name.trim()
    if (trimmed) onSubmit(trimmed, selectedHue)
  }

  return (
    <div className="space-y-3 p-2.5">
      <TextInput
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder={placeholder}
        inputSize="sm"
      />
      {submitLabel === 'Create space' && (
        <div className="flex items-center gap-1.5 px-0.5">
          {SPACE_PRESET_HUES.map((preset) => (
            <Button
              key={preset.hue}
              variant="ghost"
              size="none"
              rounded="rounded-full"
              onClick={() => setSelectedHue(preset.hue)}
              aria-label={preset.label}
              className={`h-6 w-6 rounded-full transition-all duration-100 ${selectedHue === preset.hue ? 'scale-110 ring-2 ring-[var(--app-accent)] ring-offset-1 ring-offset-[var(--app-bg-primary)]' : 'hover:scale-110'}`}
              style={preset.hue >= 0 ? { background: `hsl(${preset.hue} 55% 55%)` } : undefined}
            >
              {preset.hue < 0 && <span className="h-3 w-3 rounded-full bg-[var(--app-control-active)]" />}
            </Button>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <Button variant="primary" size="sm" onClick={submit} disabled={!name.trim()} className="flex-1">
          {submitLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function SpaceRow({
  space,
  isActive,
  onSelect,
  onMoveTab,
  onDelete,
}: {
  space: AccountSpace
  isActive: boolean
  onSelect: () => void
  onMoveTab: () => void
  onDelete: () => void
}): React.JSX.Element {
  const hasTint = space.hue >= 0
  const tintStyle = hasTint ? { color: `hsl(${space.hue} 55% 55%)` } : undefined
  return (
    <Button
      variant="ghost"
      size="none"
      onClick={onSelect}
      active={isActive}
      className="group h-10 w-full justify-start gap-2 rounded-lg px-2.5 text-left"
    >
      <span style={tintStyle} className="flex">
        <SvgIcon svg={boxSvg} size={15} />
      </span>
      <Text as="span" size="caption" tone="primary" className="min-w-0 flex-1 truncate font-medium">
        {space.name}
      </Text>
      <Text as="span" size="caption" tone="muted" className="tabular-nums">
        {space.tabIds.length}
      </Text>
      {!isActive && (
        <Button
          variant="ghost"
          size="none"
          onClick={(e) => {
            e.stopPropagation()
            onMoveTab()
          }}
          aria-label={`Move current tab to ${space.name}`}
          className="h-8 w-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <SvgIcon svg={rightSmallSvg} size={14} />
        </Button>
      )}
      {space.id !== DEFAULT_SPACE_ID && (
        <Button
          variant="ghost"
          size="none"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          aria-label={`Delete ${space.name}`}
          className="h-8 w-8 text-[var(--app-text-tertiary)] opacity-0 hover:text-[var(--app-danger)] group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <SvgIcon svg={trashSvg} size={13} />
        </Button>
      )}
    </Button>
  )
}

function SpaceSwitcherInner(): React.JSX.Element {
  const [mode, setMode] = useState<'list' | 'new-account' | 'new-space'>('list')
  const { accounts, accountOrder, activeAccountId } = useAccountStore(useShallow((s) => ({
    accounts: s.accounts,
    accountOrder: s.accountOrder,
    activeAccountId: s.activeAccountId,
  })))
  const addAccount = useAccountStore((s) => s.addAccount)
  const addSpace = useAccountStore((s) => s.addSpace)
  const switchAccount = useAccountStore((s) => s.switchAccount)
  const switchSpace = useAccountStore((s) => s.switchSpace)
  const removeSpace = useAccountStore((s) => s.removeSpace)
  const moveTabToSpace = useAccountStore((s) => s.moveTabToSpace)
  const activeAccount = accounts[activeAccountId]
  const activeSpace = activeAccount?.spaces[activeAccount.activeSpaceId]

  const { isOpen, setOpen } = useUIStore(useShallow((s) => ({
    isOpen: s.isSpaceSwitcherOpen,
    setOpen: s.setSpaceSwitcherOpen,
  })))
  const { disableAnimations, uiLayout } = useSettingsStore(useShallow((s) => ({
    disableAnimations: s.disableAnimations,
    uiLayout: s.uiLayout,
  })))
  const popoverBelow = uiLayout === 'classic'
  const { enterY, exitY } = getPopoverMotion(popoverBelow)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setPopoverPos(null)
      return
    }
    const rect = triggerRef.current.getBoundingClientRect()
    setPopoverPos({
      left: popoverBelow ? 2 : clampPopoverLeft(rect, POPOVER_WIDTH),
      top: popoverBelow ? 42 : clampPopoverTop(rect, POPOVER_ESTIMATED_HEIGHT, popoverBelow),
    })
  }, [isOpen, popoverBelow])

  useEffect(() => {
    if (!isOpen) setMode('list')
  }, [isOpen])

  const close = useCallback(() => {
    setOpen(false)
    setMode('list')
  }, [setOpen])

  const activateFirstTabInSpace = useCallback((accountId: string, spaceId: string) => {
    const account = useAccountStore.getState().accounts[accountId]
    const space = account?.spaces[spaceId]
    const tabStore = useTabStore.getState()
    const target = space?.activeTabId || space?.tabIds.find((id) => tabStore.tabs[id])
    if (target && tabStore.tabs[target]) tabStore.setActiveTab(target)
    else tabStore.addTab()
  }, [])

  const selectAccount = useCallback((accountId: string) => {
    const account = accounts[accountId]
    if (!account) return
    switchAccount(accountId)
    activateFirstTabInSpace(accountId, account.activeSpaceId)
  }, [accounts, activateFirstTabInSpace, switchAccount])

  const selectSpace = useCallback((spaceId: string) => {
    if (!activeAccount) return
    switchSpace(spaceId)
    activateFirstTabInSpace(activeAccount.id, spaceId)
    close()
  }, [activeAccount, activateFirstTabInSpace, close, switchSpace])

  const moveActiveTab = useCallback((spaceId: string) => {
    const tabId = useTabStore.getState().activeTabId
    if (!tabId || !activeAccount) return
    moveTabToSpace(tabId, spaceId)
    useTabStore.getState().updateTab(tabId, { accountId: activeAccount.id, spaceId })
  }, [activeAccount, moveTabToSpace])

  const activeHue = activeSpace?.hue ?? -1

  return (
    <div className={`relative ${popoverBelow ? '' : 'h-full'}`} ref={triggerRef}>
      <Button
        variant="ghost"
        size="none"
        onClick={() => setOpen(!isOpen)}
        aria-label={activeAccount && activeSpace ? `Switch account or space (${activeAccount.name}, ${activeSpace.name})` : 'Switch account or space'}
        whileTap={disableAnimations ? undefined : { scale: 0.88 }}
        transition={disableAnimations ? { duration: 0 } : SPRING_SNAPPY}
        className={`${popoverBelow ? 'h-9 w-9' : 'h-full aspect-square'} flex items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)]`}
        style={activeHue >= 0 ? { background: `hsla(${activeHue} 55% 55% / 0.08)`, color: `hsl(${activeHue} 55% 55%)` } : undefined}
      >
        <SvgIcon svg={personSvg} size={16} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[99]" onMouseDown={close} />
            <m.div
              className={`${popoverBelow ? 'fixed' : 'absolute bottom-full mb-2'} z-[100] w-[320px]`}
              style={popoverBelow ? { left: popoverPos?.left, top: popoverPos?.top, originX: 0, originY: 0 } : { left: '50%', x: '-50%', originX: 0.5, originY: 1 }}
              initial={disableAnimations ? undefined : { scale: 0.98, opacity: 0, y: enterY }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={disableAnimations ? undefined : { scale: 0.98, opacity: 0, y: exitY }}
              transition={disableAnimations ? { duration: 0 } : { duration: 0.12, ease: 'easeOut' }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="overflow-hidden rounded-xl border border-[var(--app-separator)] bg-[var(--app-bg-secondary)] text-[var(--app-text-primary)] shadow-sm">
                <AnimatePresence mode="wait" initial={false}>
                  {mode === 'new-account' ? (
                    <m.div key="new-account">
                      <NameForm
                        placeholder="Account name"
                        submitLabel="Create account"
                        onSubmit={(name) => {
                          const id = addAccount(name)
                          selectAccount(id)
                          setMode('list')
                        }}
                        onCancel={() => setMode('list')}
                      />
                    </m.div>
                  ) : mode === 'new-space' ? (
                    <m.div key="new-space">
                      <NameForm
                        placeholder="Space name"
                        submitLabel="Create space"
                        onSubmit={(name, hue) => {
                          const id = addSpace(name, hue)
                          selectSpace(id)
                        }}
                        onCancel={() => setMode('list')}
                      />
                    </m.div>
                  ) : (
                    <m.div key="list" className="p-2">
                      <Text size="caption" tone="muted" className="px-2 pb-1 font-medium tracking-wide">
                        Accounts
                      </Text>
                      <div className="space-y-1">
                        {accountOrder.map((id) => {
                          const account = accounts[id]
                          if (!account) return null
                          const isActive = id === activeAccountId
                          return (
                            <Button
                              key={id}
                              variant="ghost"
                              size="none"
                              active={isActive}
                              onClick={() => selectAccount(id)}
                              className="h-10 w-full justify-start gap-2 rounded-lg px-2.5"
                            >
                              <SvgIcon svg={personSvg} size={15} />
                              <Text as="span" size="caption" tone="primary" className="min-w-0 flex-1 truncate font-medium">
                                {account.name}
                              </Text>
                              <Text as="span" size="caption" tone="muted">
                                {account.spaceOrder.length} spaces
                              </Text>
                            </Button>
                          )
                        })}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setMode('new-account')} className="mt-1 w-full justify-start gap-2">
                        <SvgIcon svg={plusSvg} size={13} />
                        New account
                      </Button>

                      <div className="my-2 h-px bg-[var(--app-separator)]" />
                      <Text size="caption" tone="muted" className="px-2 pb-1 font-medium tracking-wide">
                        {activeAccount?.name ?? 'Account'} spaces
                      </Text>
                      <div className="space-y-1">
                        {activeAccount?.spaceOrder.map((spaceId) => {
                          const space = activeAccount.spaces[spaceId]
                          if (!space) return null
                          return (
                            <SpaceRow
                              key={space.id}
                              space={space}
                              isActive={space.id === activeAccount.activeSpaceId}
                              onSelect={() => selectSpace(space.id)}
                              onMoveTab={() => moveActiveTab(space.id)}
                              onDelete={() => removeSpace(space.id)}
                            />
                          )
                        })}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setMode('new-space')} className="mt-1 w-full justify-start gap-2">
                        <SvgIcon svg={plusSvg} size={13} />
                        New space
                      </Button>
                      {activeAccountId !== DEFAULT_ACCOUNT_ID && (
                        <Text size="caption" tone="muted" className="block px-2 pt-2">
                          This account uses its own cookies, logins, and site data.
                        </Text>
                      )}
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export const SpaceSwitcher = memo(SpaceSwitcherInner)
