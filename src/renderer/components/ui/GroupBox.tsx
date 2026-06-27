import type { ReactNode } from "react";
import { Text } from "@/components/ui/Text";
import { cn } from "@/utils/classNames";

export function GroupBox({
  title,
  desc,
  children,
  className = "",
  contentClassName = "",
}: {
  title?: ReactNode;
  desc?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}): React.JSX.Element {
  return (
    <section
      className={cn(
        "rounded-xl bg-[var(--app-grouped-bg-secondary)] p-3",
        className,
      )}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "auto 180px",
      }}
    >
      {(title || desc) && (
        <div className="px-1 pb-3">
          {title && (
            <Text as="h3" size="label" tone="primary" className="mb-1">
              {title}
            </Text>
          )}
          {desc && (
            <Text size="caption" tone="muted">
              {desc}
            </Text>
          )}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
