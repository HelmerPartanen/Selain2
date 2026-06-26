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
        "w-full rounded-xl bg-transparent dark:bg-transparent focus:bg-transparent dark:focus:bg-black/15 border text-gray-800 dark:text-neutral-200 placeholder:text-gray-400 dark:placeholder:text-neutral-500 outline-none transition-all duration-200",
        "focus-visible:ring-2",
        inputSize === "sm" ? "h-8 px-2.5 text-[12px]" : "h-10 px-3.5 text-[13px]",
        invalid
          ? "border-red-500/10 dark:border-red-400/10 ring-1 ring-red-500/50 dark:ring-red-400/50"
          : "border-black/10 dark:border-white/10 ring-1 ring-transparent focus:ring-blue-500/50 dark:focus:ring-blue-400/50",
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
        "h-1 flex-1 cursor-pointer appearance-none rounded-full bg-black/[0.08] dark:bg-white/[0.10]",
        "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-black/[0.08] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb:hover]:scale-115 [&::-webkit-slider-thumb:active]:scale-110",
        "dark:[&::-webkit-slider-thumb]:bg-neutral-200 dark:[&::-webkit-slider-thumb]:ring-white/[0.1]",
        className,
      )}
      {...props}
    />
  ),
);

RangeInput.displayName = "RangeInput";
