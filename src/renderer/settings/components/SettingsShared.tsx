// ─── Shared Settings UI Components ───────────────────────────────────────────
// Reusable primitives used across all settings panes.
// Extracted from SettingsPanel to enforce single-responsibility and reduce
// duplication. Each component is intentionally minimal.

/** Primary section heading used in every settings pane */
export function SectionHeader({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h3 className="text-[15px] font-normal text-gray-900 dark:text-white mb-1">{children}</h3>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="text-[11px] font-medium tracking-wide uppercase text-gray-400 dark:text-neutral-500">
      {children}
    </span>
  )
}

export function Desc({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="text-[12px] text-gray-500 dark:text-neutral-400 mb-4">{children}</p>
  )
}

export function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}): React.JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-[42px] h-[24px] rounded-full flex-shrink-0 transition-colors duration-200 ${
        checked
          ? 'bg-indigo-500 dark:bg-indigo-400'
          : 'bg-gray-300 dark:bg-neutral-600'
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export function SettingRow({
  label,
  desc,
  children
}: {
  label: string
  desc?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-[13px] font-normal text-gray-800 dark:text-neutral-200">{label}</div>
        {desc && <div className="text-[12px] text-gray-500 dark:text-neutral-400 mt-0.5">{desc}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}
