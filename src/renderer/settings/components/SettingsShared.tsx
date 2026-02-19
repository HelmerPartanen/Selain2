// ─── Shared Settings UI Components ───────────────────────────────────────────
// Reusable primitives used across all settings panes.
// Extracted from SettingsPanel to enforce single-responsibility and reduce
// duplication. Each component is intentionally minimal.

import { motion } from "motion/react";
import { SPRING_SNAPPY } from "@/utils/springs";

/** Primary section heading used in every settings pane */
export function SectionHeader({
  children,
  className = ""
}: {
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <h3
      className={`text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-500 mb-3 ${className}`}
    >
      {children}
    </h3>
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
      <motion.span
        className="absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 18 : 0 }}
        transition={SPRING_SNAPPY}
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
    <div className="flex items-center justify-between gap-4 py-3 px-3 -mx-3 rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-150">
      <div className="min-w-0">
        <div className="text-[13px] font-normal text-gray-800 dark:text-neutral-200">{label}</div>
        {desc && <div className="text-[12px] text-gray-500 dark:text-neutral-400 mt-0.5">{desc}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}
