import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { Text } from "@/components/ui/Text";
import closeSvg from "@/assets/icons/Interface/Close_Cross.svg?raw";
import { cn } from "@/utils/classNames";

export function PanelHeader({
  icon,
  title,
  actions,
  onClose,
  closeLabel,
}: {
  icon: string;
  title: string;
  actions?: ReactNode;
  onClose: () => void;
  closeLabel: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-shrink-0 items-center justify-between gap-3 px-3 py-3">
      <Text as="h2" size="label" tone="primary" className="flex min-w-0 items-center gap-2 font-medium">
        <SvgIcon svg={icon} size={16} className="shrink-0 text-[var(--app-text-secondary)]" />
        <span className="truncate">{title}</span>
      </Text>
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        <Button
          variant="icon"
          size="icon-sm"
          rounded="rounded-lg"
          onClick={onClose}
          aria-label={closeLabel}
        >
          <SvgIcon svg={closeSvg} size={13} />
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon: string;
  title: string;
  description?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <SvgIcon svg={icon} size={36} className="mb-3 text-[var(--app-text-tertiary)] opacity-60" />
      <Text size="body" tone="primary" className="font-medium">
        {title}
      </Text>
      {description && (
        <Text size="caption" tone="muted" className="mt-1 max-w-[280px]">
          {description}
        </Text>
      )}
    </div>
  );
}
