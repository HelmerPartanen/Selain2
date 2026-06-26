import { motion } from "motion/react";
import { Card } from "@/components/ui/Card";
import { Text } from "@/components/ui/Text";
import { SPRING_SNAPPY } from "@/utils/springs";
import { cn } from "@/utils/classNames";

export function SectionHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <Text as="h3" size="label" tone="primary" className={cn("mb-1", className)}>
      {children}
    </Text>
  );
}

export function Desc({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <Text size="caption" tone="muted" className={cn("mb-4", className)}>
      {children}
    </Text>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}): React.JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[22px] w-[42px] flex-shrink-0 rounded-full transition-colors duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900",
        checked
          ? "bg-emerald-500 dark:bg-green-400"
          : "bg-gray-300 dark:bg-neutral-600",
      )}
    >
      <motion.span
        className="absolute left-[2px] top-[2px] h-[18px] w-[24px] rounded-full border border-white bg-white"
        animate={{ x: checked ? 14 : 0 }}
        transition={SPRING_SNAPPY}
      />
    </button>
  );
}

export function SettingRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card
      variant="interactive"
      padding="md"
      className="flex items-center justify-between gap-4"
    >
      <div className="min-w-0">
        <Text size="body" tone="secondary" className="font-normal">
          {label}
        </Text>
        {desc && (
          <Text size="caption" tone="muted" className="mt-0.5">
            {desc}
          </Text>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </Card>
  );
}

export function SettingGroup({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn("rounded-xl", className)}>
      {children}
    </div>
  );
}
