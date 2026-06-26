import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/classNames";

interface SegmentedOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string | number> {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
  optionClassName?: string;
}

export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  className,
  optionClassName,
  ...aria
}: SegmentedControlProps<T>): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex gap-1 p-1 rounded-xl bg-[var(--app-grouped-bg-secondary)]",
        className,
      )}
      role="radiogroup"
      aria-label={aria["aria-label"]}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <Button
            key={String(option.value)}
            variant="segment"
            size="sm"
            active={isActive}
            role="radio"
            aria-checked={isActive}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={cn("relative flex-1", optionClassName)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
