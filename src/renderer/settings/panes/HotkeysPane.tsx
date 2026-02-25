import { memo, useState } from "react";
import { motion } from "motion/react";
import { SPRING_SNAPPY, SPRING_LIST } from "@/utils/springs";
import { SectionHeader, Desc } from "@/settings/components/SettingsShared";

const ShortcutRow = memo(function ShortcutRow({
    description,
    keys,
    index
}: {
    description: string
    keys: string
    index: number
}): React.JSX.Element {
    const [hovered, setHovered] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_LIST, delay: index * 0.02 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            className="relative flex items-center justify-between gap-4 px-3 py-1.5 rounded-full hover:scale-105 transition-all duration-150"
        >
            {hovered && (
                <motion.div
                    layoutId="hotkey-hover"
                    className="absolute inset-0 rounded-full glass bg-white/20 dark:bg-white/6 shadow ring-1 ring-black/5 dark:ring-white/10"
                    initial={{ opacity: 0.5, filter: 'blur(2px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(2px)' }}
                    transition={SPRING_SNAPPY}
                />
            )}
            <span className="relative text-[13px] text-gray-700 dark:text-neutral-300 z-10">{description}</span>
            <div className="relative z-10">
                <KeyCombo keys={keys} />
            </div>
        </motion.div>
    )
})

interface Shortcut {
    keys: string
    description: string
}

interface ShortcutGroup {
    label: string
    shortcuts: Shortcut[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        label: 'Tabs',
        shortcuts: [
            { keys: 'Ctrl + T', description: 'New tab' },
            { keys: 'Ctrl + W', description: 'Close current tab' },
            { keys: 'Ctrl + Shift + T', description: 'Reopen last closed tab' },
            { keys: 'Ctrl + Tab', description: 'Next tab' },
            { keys: 'Ctrl + Shift + Tab', description: 'Previous tab' },
            { keys: 'Ctrl + 1–9', description: 'Switch to tab 1–9' },
            { keys: 'Ctrl + Shift + A', description: 'Tab overview' },
            { keys: 'Ctrl + Shift + S', description: 'Toggle split view' },
            { keys: 'Ctrl + Shift + X', description: 'Swap split panels' }
        ]
    },
    {
        label: 'Navigation',
        shortcuts: [
            { keys: 'Ctrl + L', description: 'Focus URL bar' },
            { keys: 'Ctrl + R', description: 'Reload page' },
            { keys: 'F5', description: 'Reload page' },
            { keys: 'Alt + ←', description: 'Go back' },
            { keys: 'Alt + →', description: 'Go forward' }
        ]
    },
    {
        label: 'Tools',
        shortcuts: [
            { keys: 'Ctrl + F', description: 'Find in page' },
            { keys: 'Escape', description: 'Close find bar / panels' }
        ]
    }
]

function KeyBadge({ label }: { label: string }): React.JSX.Element {
    return (
        <span className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-1.5 rounded-md glass border border-gray-200 dark:border-neutral-700 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 leading-none">
            {label}
        </span>
    )
}

function KeyCombo({ keys }: { keys: string }): React.JSX.Element {
    const parts = keys.split(' + ')
    return (
        <div className="flex items-center gap-1 flex-shrink-0">
            {parts.map((part, i) => (
                <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-[10px] text-gray-300 dark:text-neutral-600">+</span>}
                    <KeyBadge label={part} />
                </span>
            ))}
        </div>
    )
}

function HotkeysPaneInner(): React.JSX.Element {
    return (
        <div className="space-y-7 pb-4">
            {SHORTCUT_GROUPS.map((group) => (
                <div key={group.label}>
                    <SectionHeader>{group.label}</SectionHeader>
                    <div className="space-y-0.5 mt-2">
                        {group.shortcuts.map((shortcut, idx) => (
                            <ShortcutRow
                                key={shortcut.keys}
                                description={shortcut.description}
                                keys={shortcut.keys}
                                index={idx}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export const HotkeysPane = memo(HotkeysPaneInner);
