import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/classNames";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  inputSize?: "sm" | "md";
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ invalid = false, inputSize = "md", className, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={props["aria-invalid"] ?? invalid}
      className={cn(
        "w-full rounded-xl bg-[var(--app-bg-tertiary)] border text-[var(--app-text-primary)] placeholder:text-[var(--app-text-tertiary)] outline-none transition-all duration-200",
        "focus-visible:ring-2",
        inputSize === "sm" ? "h-8 px-2.5 text-[12px]" : "h-10 px-3.5 text-[13px]",
        invalid
          ? "border-[var(--app-danger)] ring-1 ring-[var(--app-danger)]"
          : "border-[var(--app-separator)] ring-1 ring-transparent focus:ring-[var(--app-accent)]",
        className,
      )}
      {...props}
    />
  ),
);

TextInput.displayName = "TextInput";

export const RangeInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type: _type, ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      className={cn(
        "h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--app-control-active)]",
        "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--app-bg-tertiary)] [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-[var(--app-separator)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb:hover]:scale-115 [&::-webkit-slider-thumb:active]:scale-110",
        className,
      )}
      {...props}
    />
  ),
);

RangeInput.displayName = "RangeInput";
