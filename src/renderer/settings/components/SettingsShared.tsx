import { Text } from "@/components/ui/Text";
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
        "relative h-[22px] w-[42px] flex-shrink-0 rounded-full transition-colors duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg-primary)]",
        checked
          ? "bg-[var(--app-accent)]"
          : "bg-[var(--app-control-hover)]",
      )}
    >
      <span
        className={cn(
          "absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-150 ease-out",
          checked ? "translate-x-[20px]" : "translate-x-0",
        )}
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
    <div className="flex items-center justify-between gap-4 border-b border-[var(--app-separator)] px-4 py-3 last:border-b-0">
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
    </div>
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
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-[var(--app-grouped-bg-secondary)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
