// ─── Space Switcher ──────────────────────────────────────────────────────────
// Floating bar pill + popup for switching, creating, editing and deleting Spaces.
// Sits between the AppMenu and the first divider in the floating controls bar.

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Input'
import { SvgIcon } from '@/components/ui/SvgIcon'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import boxSvg from '@/assets/icons/Interface/Menu_Points_3.svg?raw'
import pencilSvg from '@/assets/icons/Objects/Pencil.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import rightSmallSvg from '@/assets/icons/Arrows/Right_Small.svg?raw'
import { useSpaceStore, SPACE_PRESET_HUES, DEFAULT_SPACE_ID, type Space } from '@/store/spaceStore'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { SPRING_POPUP, SPRING_SNAPPY } from '@/utils/springs'
import { clampPopoverLeft, clampPopoverTop, getPopoverMotion } from '@/utils/popoverPosition'

const SPACE_POPOVER_WIDTH = 280
const SPACE_POPOVER_ESTIMATED_HEIGHT = 360


// ─── Space Row ───────────────────────────────────────────────────────────────

function SpaceRow({
  space,
  isActive,
  index,
  hasMultipleSpaces,
  onSelect,
  onEdit,
  onDelete,
  onMoveTab,
  disableAnimations,
}: {
  space: Space
  isActive: boolean
  index: number
  hasMultipleSpaces: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onMoveTab: () => void
  disableAnimations: boolean
}): React.JSX.Element {
  const isGeneral = space.id === DEFAULT_SPACE_ID
  const hasTint = space.hue >= 0

  const animationStyle = disableAnimations
    ? { opacity: 1, animation: 'none' as const }
    : {
        opacity: 0,
        animation: `menu-item-in 180ms ease-out ${60 + index * 25}ms forwards`,
      }

  const tintStyle = hasTint
    ? { background: `hsla(${space.hue} 55% 55% / ${isActive ? 0.14 : 0.08})` }
    : undefined

  const accentColor = hasTint ? `hsl(${space.hue} 55% 55%)` : undefined

  return (
    <Button
      variant="ghost"
      size="none"
      onClick={onSelect}
      className={`group flex items-center justify-start gap-1 w-full pr-0.5 pl-2.5 h-10 rounded-lg text-left transition-colors duration-75 ${
        isActive
          ? hasTint
            ? ''
            : 'bg-[var(--app-control-active)] text-[var(--app-text-primary)]'
          : hasTint
            ? ''
            : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)]'
      }`}
      style={{ ...animationStyle, ...tintStyle }}
    >
      <span
        className="flex-shrink-0"
        style={accentColor ? { color: accentColor } : undefined}
      >
        <div style={{ display: 'flex' }}>
          <SvgIcon svg={boxSvg} size={16} />
        </div>
      </span>
      <span
        className="flex-1 text-[13px] truncate"
        style={accentColor ? { color: accentColor } : undefined}
      >
        {space.name}
      </span>
      

      {/* Move active tab here — only on non-active spaces when multiple exist */}
      {!isActive && hasMultipleSpaces && (
        <div
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:text-blue-500 hover:bg-blue-500/[0.08] dark:hover:bg-blue-500/[0.08] transition-all duration-100"
          onClick={(e) => {
            e.stopPropagation()
            onMoveTab()
          }}
          title="Move current tab here"
        >
          <SvgIcon svg={rightSmallSvg} size={14} />
        </div>
      )}

      {/* Edit */}
      <div
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 cursor-pointer text-[var(--app-text-secondary)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)] transition-all duration-100"
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
      >
        <SvgIcon svg={pencilSvg} size={14} />
      </div>

      {/* Delete (not General) */}
      {!isGeneral && (
        <div
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:bg-red-500/[0.08] dark:hover:bg-red-500/[0.08] hover:text-red-500 transition-all duration-100"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <SvgIcon svg={trashSvg} size={14} />
        </div>
      )}
    </Button>
  )
}

// ─── New Space Form ──────────────────────────────────────────────────────────

function NewSpaceForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string, hue: number) => void
  onCancel: () => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [selectedHue, setSelectedHue] = useState(145)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (): void => {
    const trimmed = name.trim()
    if (trimmed) onSubmit(trimmed, selectedHue)
  }

  return (
    <div className="p-2.5 space-y-3">
      <TextInput
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Space name…"
        inputSize="sm"
      />

      {/* Color picker */}
      <div className="flex items-center gap-1.5 px-0.5">
        <Button
          variant="ghost"
          size="none"
          rounded="rounded-full"
          onClick={() => setSelectedHue(-1)}
          className={`w-6 h-6 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center transition-all duration-100 ${
            selectedHue === -1
              ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-blue-500 dark:ring-offset-neutral-800 scale-110'
              : 'hover:scale-110'
          }`}
          title="No tint"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-400 dark:text-neutral-500">
            <line x1="1.5" y1="8.5" x2="8.5" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Button>
        {SPACE_PRESET_HUES.filter((p) => p.hue >= 0).map((preset) => (
          <Button
            variant="ghost"
            size="none"
            rounded="rounded-full"
            key={preset.hue}
            onClick={() => setSelectedHue(preset.hue)}
            className={`w-6 h-6 rounded-full transition-all duration-100 ${
              selectedHue === preset.hue
                ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-blue-500 dark:ring-offset-neutral-800 scale-110'
                : 'hover:scale-110'
            }`}
            style={{ background: `hsl(${preset.hue} 55% 55%)` }}
            title={preset.label}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <Button
          variant="subtle"
          size="sm"
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="flex-1"
        >
          Create
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Edit Space Form ─────────────────────────────────────────────────────────

function EditSpaceForm({
  space,
  onDone,
}: {
  space: Space
  onDone: () => void
}): React.JSX.Element {
  const [name, setName] = useState(space.name)
  const [selectedHue, setSelectedHue] = useState(space.hue)
  const renameSpace = useSpaceStore((s) => s.renameSpace)
  const setSpaceHue = useSpaceStore((s) => s.setSpaceHue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSave = (): void => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== space.name) renameSpace(space.id, trimmed)
    if (selectedHue !== space.hue) setSpaceHue(space.id, selectedHue)
    onDone()
  }

  return (
    <div className="p-2.5 space-y-2.5">
      <TextInput
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') onDone()
        }}
        inputSize="sm"
      />

      {/* Color picker — include "None" option */}
      <div className="flex items-center gap-1.5 px-0.5">
        <Button
          variant="ghost"
          size="none"
          rounded="rounded-full"
          onClick={() => setSelectedHue(-1)}
          className={`w-5 h-5 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center transition-all duration-100 ${
            selectedHue === -1
              ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-neutral-400 dark:ring-offset-neutral-800 scale-110'
              : 'hover:scale-110'
          }`}
          title="None"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-400 dark:text-neutral-500">
            <line x1="1.5" y1="8.5" x2="8.5" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Button>
        {SPACE_PRESET_HUES.filter((p) => p.hue >= 0).map((preset) => (
          <Button
            variant="ghost"
            size="none"
            rounded="rounded-full"
            key={preset.hue}
            onClick={() => setSelectedHue(preset.hue)}
            className={`w-5 h-5 rounded-full transition-all duration-100 ${
              selectedHue === preset.hue
                ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-neutral-400 dark:ring-offset-neutral-800 scale-110'
                : 'hover:scale-110'
            }`}
            style={{ background: `hsl(${preset.hue} 55% 55%)` }}
            title={preset.label}
          />
        ))}
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={handleSave}
        className="w-full"
      >
        Save
      </Button>
    </div>
  )
}

// ─── SpaceSwitcher (main exported component) ─────────────────────────────────

function SpaceSwitcherInner(): React.JSX.Element {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const spaces = useSpaceStore(useShallow((s) => s.spaces))
  const spaceOrder = useSpaceStore(useShallow((s) => s.spaceOrder))
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId)
  const addSpace = useSpaceStore((s) => s.addSpace)
  const removeSpace = useSpaceStore((s) => s.removeSpace)
  const switchSpace = useSpaceStore((s) => s.switchSpace)
  const moveTabToSpace = useSpaceStore((s) => s.moveTabToSpace)

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
  const popoverSurface = 'bg-[var(--app-bg-secondary)] border border-[var(--app-separator)] text-[var(--app-text-primary)]'
  const triggerRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setPopoverPos(null)
      return
    }
    const rect = triggerRef.current.getBoundingClientRect()
    if (!popoverBelow) {
      // Bottom toolbar layout: anchor above trigger
      const left = clampPopoverLeft(rect, SPACE_POPOVER_WIDTH)
      const top = clampPopoverTop(rect, SPACE_POPOVER_ESTIMATED_HEIGHT, popoverBelow)
      setPopoverPos({ left, top })
    } else {
      // Classic (top toolbar) layout: pin to top-left corner
      setPopoverPos({ left: 2, top: 42 })
    }
  }, [isOpen, popoverBelow])

  const activeSpace = spaces[activeSpaceId]
  const activeHue = activeSpace?.hue ?? -1
  const hasMultipleSpaces = spaceOrder.length > 1

  // Reset transient form state whenever the switcher closes (including external closes)
  useEffect(() => {
    if (!isOpen) {
      setIsCreating(false)
      setEditingId(null)
    }
  }, [isOpen])

  const handleToggle = useCallback(() => {
    setOpen(!isOpen)
    setIsCreating(false)
    setEditingId(null)
  }, [isOpen, setOpen])

  const handleClose = useCallback(() => {
    setOpen(false)
    setIsCreating(false)
    setEditingId(null)
  }, [setOpen])

  const handleSwitch = useCallback(
    (id: string) => {
      switchSpace(id)
      handleClose()
    },
    [switchSpace, handleClose]
  )

  const handleCreate = useCallback(
    (name: string, hue: number) => {
      const id = addSpace(name, hue)
      switchSpace(id)
      handleClose()
    },
    [addSpace, switchSpace, handleClose]
  )

  const handleDelete = useCallback(
    (id: string) => {
      removeSpace(id)
    },
    [removeSpace]
  )

  const handleMoveTab = useCallback(
    (targetSpaceId: string) => {
      const activeTabId = useTabStore.getState().activeTabId
      if (activeTabId) {
        moveTabToSpace(activeTabId, targetSpaceId)
      }
    },
    [moveTabToSpace]
  )

  return (
  <div className={`relative ${popoverBelow ? '' : 'h-full'}`} ref={triggerRef}>
    <Button
      variant="ghost"
      size="none"
      onClick={handleToggle}
      aria-label={activeSpace ? `Switch space (${activeSpace.name})` : 'Switch space'}
      whileTap={disableAnimations ? undefined : { scale: 0.88 }}
      whileHover={
        disableAnimations
          ? undefined
          : activeHue >= 0
          ? { filter: 'brightness(1.2)' }
          : undefined
      }
      transition={disableAnimations ? { duration: 0 } : SPRING_SNAPPY}
      style={
        activeHue >= 0
          ? { background: `hsla(${activeHue} 55% 55% / 0.08)` }
          : undefined
      }
      className={`${popoverBelow ? 'h-9 w-9' : 'h-full aspect-square'} flex items-center justify-center leading-none rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)] transition-colors duration-100 select-none`}
    >
      <span
        className="flex items-center justify-center"
        style={activeHue >= 0 ? { color: `hsl(${activeHue} 55% 55%)` } : undefined}
      >
        <div style={{ display: 'flex' }}>
          <SvgIcon svg={boxSvg} size={16} />
        </div>
      </span>
    </Button>

      {/* Popup */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-away */}
            <div className="fixed inset-0 z-[99]" onMouseDown={handleClose} />

            <motion.div
              className={`${popoverBelow ? 'fixed' : 'absolute left-1/2 bottom-full mb-2 -translate-x-1/2'} z-[100] min-w-[220px] max-w-[280px]`}
              style={
                popoverBelow
                  ? {
                      left: popoverPos?.left,
                      top: popoverPos?.top,
                      originX: 0.5,
                      originY: 0,
                      perspective: 600,
                    }
                  : {
                      originX: 0.5,
                      originY: 1,
                      perspective: 600,
                    }
              }
              initial={{ scaleX: 0.3, scaleY: 0.08, opacity: 0, y: enterY, rotateX: popoverBelow ? 16 : -16 }}
              animate={{ scaleX: 1, scaleY: 1, opacity: 1, y: 0, rotateX: 0 }}
              exit={{ scaleX: 0.3, scaleY: 0.06, opacity: 0, y: exitY, rotateX: popoverBelow ? 10 : -10 }}
              transition={{ ...SPRING_POPUP, opacity: { duration: 0.1 } }}
            >
              <div className={`rounded-xl shadow-sm overflow-hidden min-w-[280px] ${popoverSurface}`}>
                <AnimatePresence mode="wait" initial={false}>
                  {editingId && spaces[editingId] ? (
                            <motion.div
                      key={`edit-${editingId}`}
                      initial={disableAnimations ? undefined : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={disableAnimations ? undefined : { opacity: 0, scale: 0.96 }}
                      transition={disableAnimations ? { duration: 0 } : { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                      <EditSpaceForm
                        space={spaces[editingId]!}
                        onDone={() => setEditingId(null)}
                      />
                    </motion.div>
                  ) : isCreating ? (
                    <motion.div
                      key="create"
                      initial={disableAnimations ? undefined : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={disableAnimations ? undefined : { opacity: 0, scale: 0.96 }}
                      transition={disableAnimations ? { duration: 0 } : { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                      <NewSpaceForm
                        onSubmit={handleCreate}
                        onCancel={() => setIsCreating(false)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={disableAnimations ? undefined : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={disableAnimations ? undefined : { opacity: 0, scale: 0.96 }}
                      transition={disableAnimations ? { duration: 0 } : { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                    <div className="p-1 space-y-1">
                      {spaceOrder.map((id, index) => {
                        const space = spaces[id]
                        if (!space) return null
                        return (
                          <SpaceRow
                            key={id}
                            space={space}
                            isActive={id === activeSpaceId}
                            index={index}
                            hasMultipleSpaces={hasMultipleSpaces}
                            onSelect={() => handleSwitch(id)}
                            onEdit={() => setEditingId(id)}
                            onDelete={() => handleDelete(id)}
                            onMoveTab={() => handleMoveTab(id)}
                            disableAnimations={disableAnimations}
                          />
                        )
                      })}
                    </div>

                    {/* Divider */}
                    <div className="mx-2 my-1 h-px bg-[var(--border-divider)]" />

                    {/* New Space button */}
                    <div className="p-1">
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setIsCreating(true)}
                        className="h-10 w-full justify-start gap-3 rounded-xl px-2.5 text-left text-gray-500 dark:text-neutral-500"
                      >
                        <SvgIcon svg={plusSvg} size={14} />
                        <span className="text-[13px]">New Space</span>
                      </Button>
                    </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export const SpaceSwitcher = memo(SpaceSwitcherInner)
