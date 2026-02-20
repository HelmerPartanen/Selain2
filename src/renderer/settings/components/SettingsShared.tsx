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
      className={`text-[13px] font-medium text-gray-900 dark:text-white mb-1 ${className}`}
    >
      {children}
    </h3>
  )
}

export function Desc({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="text-[11px] text-gray-400 dark:text-neutral-500 mb-4 leading-relaxed">{children}</p>
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
      className={`relative w-[42px] h-[22px] rounded-full flex-shrink-0 transition-colors duration-200 ${
        checked
          ? 'bg-indigo-500/70 dark:bg-indigo-400/70'
          : 'bg-gray-300 dark:bg-neutral-600'
      }`}
    >
      <motion.span
        className="absolute top-[2px] left-[2px] w-[24px] h-[18px] rounded-full bg-gradient-to-b from-white/90 to-white/80 border border-white shadow-sm"
        animate={{ x: checked ? 14 : 0 }}
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
    <div className="flex items-center justify-between gap-4 py-3 px-3.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-150">
      <div className="min-w-0">
        <div className="text-[13px] font-normal text-gray-700 dark:text-neutral-200">{label}</div>
        {desc && <div className="text-[11px] text-gray-400 dark:text-neutral-500 mt-0.5 leading-relaxed">{desc}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

/** Grouped card surface for related settings */
export function SettingGroup({
  children,
  className = ""
}: {
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div className={`rounded-2xl ${className}`}>
      {children}
    </div>
  )
}
