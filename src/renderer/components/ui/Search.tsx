import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";
import closeSvg from "@/assets/icons/Interface/Close_Cross.svg?raw";
import searchSvg from "@/assets/icons/Objects/Search.svg?raw";
import { Button } from "@/components/ui/Button";
import { SvgIcon } from "@/components/ui/SvgIcon";
import { SPRING_FAST } from "@/utils/springs";
import { cn } from "@/utils/classNames";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
  leadingSlot?: ReactNode;
  clearable?: boolean;
  clearVisible?: boolean;
  clearLabel?: string;
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      containerClassName,
      leadingSlot,
      clearable = false,
      clearVisible,
      clearLabel = "Clear search",
      onClear,
      className,
      value,
      ...props
    },
    ref,
  ) => {
    const hasValue = typeof value === "string" ? value.length > 0 : Boolean(value);
    const showClear = clearable && (clearVisible ?? hasValue);

    return (
      <div className={cn("relative flex h-full min-w-0 flex-1 items-center", containerClassName)}>
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-7 items-center justify-center">
          {leadingSlot ?? (
            <span className="flex items-center justify-center text-[var(--app-text-secondary)]">
              <SvgIcon svg={searchSvg} size={14} />
            </span>
          )}
        </div>

        <input
          ref={ref}
          type="search"
          value={value}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent pl-7 pr-0 text-[13px] text-[var(--app-text-primary)] outline-none placeholder:text-[var(--app-text-secondary)] focus:ring-0",
            "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            showClear && "pr-8",
            className,
          )}
          {...props}
        />

        <AnimatePresence initial={false}>
          {showClear && (
            <m.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={SPRING_FAST}
              className="absolute inset-y-0 right-0 z-10 flex w-8 items-center justify-center"
            >
              <Button
                variant="icon"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onClear?.();
                }}
                className="!h-6 !w-6 !min-w-[24px] !p-0 text-[var(--app-text-secondary)]"
                aria-label={clearLabel}
              >
                <SvgIcon svg={closeSvg} size={13} />
              </Button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
