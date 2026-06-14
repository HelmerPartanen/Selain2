// ─── Space Switcher ──────────────────────────────────────────────────────────
// Floating bar pill + popup for switching, creating, editing and deleting Spaces.
// Sits between the AppMenu and the first divider in the floating controls bar.

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useShallow } from 'zustand/react/shallow'
import { SvgIcon } from '@/components/ui/SvgIcon'
import plusSvg from '@/assets/icons/Maths/Plus.svg?raw'
import pencilSvg from '@/assets/icons/Objects/Pencil.svg?raw'
import trashSvg from '@/assets/icons/Objects/Trash.svg?raw'
import rightSmallSvg from '@/assets/icons/Arrows/Right_Small.svg?raw'
import { useSpaceStore, SPACE_PRESET_HUES, DEFAULT_SPACE_ID, type Space } from '@/store/spaceStore'
import { useTabStore } from '@/store/tabStore'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { SPRING_POPUP, SPRING_SNAPPY } from '@/utils/springs'

// ─── Space Dot ───────────────────────────────────────────────────────────────

function SpaceDot({ hue, size = 8 }: { hue: number; size?: number }): React.JSX.Element {
  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: hue >= 0
          ? `hsl(${hue} 55% 55%)`
          : 'rgba(128, 128, 128, 0.3)',
      }}
    />
  )
}

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
}: {
  space: Space
  isActive: boolean
  index: number
  hasMultipleSpaces: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onMoveTab: () => void
}): React.JSX.Element {
  const tabCount = space.tabIds.length
  const isGeneral = space.id === DEFAULT_SPACE_ID

  return (
    <button
      onClick={onSelect}
      className={`group flex items-center gap-2.5 w-full px-2.5 h-8 rounded-xl text-left transition-colors duration-75 ${
        isActive
          ? 'bg-black/[0.05] dark:bg-white/[0.08] text-gray-900 dark:text-white'
          : 'text-gray-600 dark:text-neutral-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white'
      }`}
      style={disableAnimations
        ? { opacity: 1, animation: 'none' }
        : {
            opacity: 0,
            animation: `menu-item-in 180ms ease-out ${60 + index * 25}ms forwards`,
          }}
    >
      <SpaceDot hue={space.hue} />
      <span className="flex-1 text-xs truncate">{space.name}</span>
      <span className="text-[10px] text-gray-400 dark:text-neutral-500 tabular-nums">
        {tabCount}
      </span>

      {/* Move active tab here — only on non-active spaces when multiple exist */}
      {!isActive && hasMultipleSpaces && (
        <div
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-100"
          onClick={(e) => {
            e.stopPropagation()
            onMoveTab()
          }}
          title="Move current tab here"
        >
          <SvgIcon svg={rightSmallSvg} size={12} />
        </div>
      )}

      {/* Edit */}
      <div
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-all duration-100"
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
      >
        <SvgIcon svg={pencilSvg} size={11} />
      </div>

      {/* Delete (not General) */}
      {!isGeneral && (
        <div
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:text-red-500 transition-all duration-100"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <SvgIcon svg={trashSvg} size={11} />
        </div>
      )}
    </button>
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
    <div className="p-2.5 space-y-2.5">
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Space name…"
        className="w-full h-8 px-2.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 outline-none focus-visible:ring-1 focus-visible:ring-gray-300 dark:focus-visible:ring-neutral-600"
      />

      {/* Color picker */}
      <div className="flex items-center gap-1.5 px-0.5">
        <button
          onClick={() => setSelectedHue(-1)}
          className={`w-5 h-5 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center transition-all duration-100 ${
            selectedHue === -1
              ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-neutral-400 dark:ring-offset-neutral-800 scale-110'
              : 'hover:scale-110'
          }`}
          title="No tint"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-400 dark:text-neutral-500">
            <line x1="1.5" y1="8.5" x2="8.5" y2="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        {SPACE_PRESET_HUES.filter((p) => p.hue >= 0).map((preset) => (
          <button
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

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="flex-1 h-7 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-medium hover:opacity-90 disabled:opacity-40 transition-opacity duration-100"
        >
          Create
        </button>
        <button
          onClick={onCancel}
          className="h-7 px-3 rounded-lg text-[11px] text-gray-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-100"
        >
          Cancel
        </button>
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
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') onDone()
        }}
        className="w-full h-8 px-2.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] text-xs text-gray-900 dark:text-white outline-none focus-visible:ring-1 focus-visible:ring-gray-300 dark:focus-visible:ring-neutral-600"
      />

      {/* Color picker — include "None" option */}
      <div className="flex items-center gap-1.5 px-0.5">
        <button
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
        </button>
        {SPACE_PRESET_HUES.filter((p) => p.hue >= 0).map((preset) => (
          <button
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

      <button
        onClick={handleSave}
        className="w-full h-7 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-medium hover:opacity-90 transition-opacity duration-100"
      >
        Save
      </button>
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

  const isOpen = useUIStore((s) => s.isSpaceSwitcherOpen)
  const setOpen = useUIStore((s) => s.setSpaceSwitcherOpen)

  const activeSpace = spaces[activeSpaceId]
  const hasMultipleSpaces = spaceOrder.length > 1
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)
  const disableBlurEffects = useSettingsStore((s) => s.disableBlurEffects)

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
    <div className="relative">
      {/* Pill trigger */}
      <motion.button
        onClick={handleToggle}
        aria-label="Switch space"
        whileTap={disableAnimations ? undefined : { scale: 0.88 }}
        transition={disableAnimations ? { duration: 0 } : SPRING_SNAPPY}
        className={`h-10 flex items-center justify-center rounded-full text-gray-600 dark:text-neutral-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors duration-100 select-none ${
          hasMultipleSpaces ? 'gap-1.5 px-2.5' : 'w-10'
        }`}
      >
        <SpaceDot hue={activeSpace?.hue ?? -1} size={7} />
        <AnimatePresence initial={false} mode="wait">
          {hasMultipleSpaces && (
            <motion.span
              key={activeSpaceId}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.15 }}
              className="text-[11px] font-medium max-w-[60px] truncate"
            >
              {activeSpace?.name ?? 'General'}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Popup */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Click-away */}
            <div className="fixed inset-0 z-[99]" onMouseDown={handleClose} />

            <motion.div
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-[100] min-w-[220px] max-w-[280px]"
              style={{ originX: 0.5, originY: 1, perspective: 600 }}
              initial={{ scaleX: 0.3, scaleY: 0.08, opacity: 0, y: 32, rotateX: -16 }}
              animate={{ scaleX: 1, scaleY: 1, opacity: 1, y: 0, rotateX: 0 }}
              exit={{ scaleX: 0.3, scaleY: 0.06, opacity: 0, y: 28, rotateX: -10 }}
              transition={{ ...SPRING_POPUP, opacity: { duration: 0.1 } }}
            >
              <div className={`rounded-xl drop-shadow-lg overflow-hidden ${disableBlurEffects ? 'bg-white dark:bg-[#121316] border border-black/10 dark:border-white/10' : 'bg-white dark:bg-[#1D1F23]'}`}>
                <AnimatePresence mode="wait" initial={false}>
                  {editingId && spaces[editingId] ? (
                            <motion.div
                      key={`edit-${editingId}`}
                      initial={disableAnimations ? undefined : { opacity: 0, scale: 0.96, filter: disableBlurEffects ? 'none' : 'blur(4px)' }}
                      animate={{ opacity: 1, scale: 1, filter: disableBlurEffects ? 'none' : 'blur(0px)' }}
                      exit={disableAnimations ? undefined : { opacity: 0, scale: 0.96, filter: disableBlurEffects ? 'none' : 'blur(4px)' }}
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
                      initial={disableAnimations ? undefined : { opacity: 0, scale: 0.96, filter: disableBlurEffects ? 'none' : 'blur(4px)' }}
                      animate={{ opacity: 1, scale: 1, filter: disableBlurEffects ? 'none' : 'blur(0px)' }}
                      exit={disableAnimations ? undefined : { opacity: 0, scale: 0.96, filter: disableBlurEffects ? 'none' : 'blur(4px)' }}
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
                      initial={disableAnimations ? undefined : { opacity: 0, scale: 0.96, filter: disableBlurEffects ? 'none' : 'blur(4px)' }}
                      animate={{ opacity: 1, scale: 1, filter: disableBlurEffects ? 'none' : 'blur(0px)' }}
                      exit={disableAnimations ? undefined : { opacity: 0, scale: 0.96, filter: disableBlurEffects ? 'none' : 'blur(4px)' }}
                      transition={disableAnimations ? { duration: 0 } : { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                    <div className="p-1 space-y-0.5">
                      {/* Header */}
                      <div className="px-2.5 pt-1.5 pb-1">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-neutral-500">
                          Spaces
                        </span>
                      </div>

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
                          />
                        )
                      })}
                    </div>

                    {/* Divider */}
                    <div className="mx-2 my-1 h-px bg-[var(--border-divider)]" />

                    {/* New Space button */}
                    <div className="p-1">
                      <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2.5 w-full px-2.5 h-8 rounded-xl text-left text-gray-500 dark:text-neutral-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-neutral-300 transition-colors duration-75"
                      >
                        <SvgIcon svg={plusSvg} size={13} />
                        <span className="text-xs">New Space</span>
                      </button>
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
