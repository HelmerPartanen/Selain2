import { memo } from "react";
import { m } from "motion/react";
import { SPRING_LIST } from "@/utils/springs";
import { SettingGroup } from "@/settings/components/SettingsShared";
import { GroupBox } from "@/components/ui/GroupBox";
import { GesturesPane } from "@/settings/panes/GesturesPane";

const ShortcutRow = memo(function ShortcutRow({
    description,
    keys,
    index
}: {
    description: string
    keys: string
    index: number
}): React.JSX.Element {
    return (
        <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_LIST, delay: index * 0.02 }}
            className="relative flex items-center justify-between gap-4 px-3 py-1.5 rounded-xl hover:bg-[var(--app-control-hover)] transition-all duration-150"
        >
            <span className="relative text-[13px] text-gray-700 dark:text-neutral-300 z-10">{description}</span>
            <div className="relative z-10">
                <KeyCombo keys={keys} />
            </div>
        </m.div>
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
            { keys: 'Ctrl + D', description: 'Duplicate current tab' },
            { keys: 'Ctrl + Shift + T', description: 'Reopen last closed tab' },
            { keys: 'Ctrl + Tab', description: 'Next tab' },
            { keys: 'Ctrl + Shift + Tab', description: 'Previous tab' },
            { keys: 'Ctrl + 1–9', description: 'Switch to tab 1–9' },
            { keys: 'Ctrl + Shift + A', description: 'Tab overview' },
            { keys: 'Ctrl + Shift + S', description: 'Toggle split view' },
            { keys: 'Ctrl + Shift + X', description: 'Swap split panels' },
            { keys: 'Ctrl + Shift + Z', description: 'Sleep current tab' }
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
            { keys: 'Ctrl + M', description: 'Mute / unmute tab' },
            { keys: 'Ctrl + F', description: 'Find in page' },
            { keys: 'Ctrl + H', description: 'Open history' },
            { keys: 'Ctrl + B', description: 'Open bookmarks' },
            { keys: 'Ctrl + ,', description: 'Open settings' },
            { keys: 'Escape', description: 'Close find bar / panels' }
        ]
    }
]

function KeyBadge({ label }: { label: string }): React.JSX.Element {
    return (
        <span className="inline-flex items-center justify-center h-[24px] min-w-[24px] px-1.5 rounded-md bg-[var(--app-bg-secondary)] text-[11px] font-semibold text-[var(--app-text-secondary)] leading-none">
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
            <GesturesPane />
            {SHORTCUT_GROUPS.map((group) => (
                <GroupBox key={group.label} title={group.label}>
                    <SettingGroup className="p-1">
                        {group.shortcuts.map((shortcut, idx) => (
                            <ShortcutRow
                                key={shortcut.keys}
                                description={shortcut.description}
                                keys={shortcut.keys}
                                index={idx}
                            />
                        ))}
                    </SettingGroup>
                </GroupBox>
            ))}
        </div>
    );
}

export const HotkeysPane = memo(HotkeysPaneInner);
