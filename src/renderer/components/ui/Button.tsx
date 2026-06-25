import {
  forwardRef,
  memo,
} from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { SPRING_SNAPPY } from "@/utils/springs";
import { cn } from "@/utils/classNames";

export type ButtonVariant =
  | "ghost"
  | "solid"
  | "subtle"
  | "primary"
  | "danger"
  | "icon"
  | "link"
  | "segment";

export type ButtonSize =
  | "none"
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "icon-sm"
  | "icon-md";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounded?: string;
  active?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  ghost:
    "text-gray-600 dark:text-neutral-300 bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.03]",
  solid:
    "text-blue-500 dark:text-blue-400 bg-blue-500/20 hover:bg-blue-600 dark:bg-blue-400/20 dark:hover:bg-blue-400/10",
  subtle:
    "text-gray-700 dark:text-neutral-300 bg-black/[0.04] dark:bg-white/15 hover:bg-black/[0.07] dark:hover:bg-white/10",
  primary:
    "text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-400 dark:hover:bg-blue-500",
  danger:
    "text-red-500 dark:text-red-400 bg-red-500/[0.06] dark:bg-red-400/15 hover:bg-red-500/10 dark:hover:bg-red-400/10",
  icon:
    "text-gray-600 dark:text-neutral-300 bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.03]",
  link:
    "text-blue-500 dark:text-blue-400 bg-transparent hover:underline",
  segment:
    "text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-400 data-[active=true]:text-gray-700 data-[active=true]:dark:text-white data-[active=true]:bg-white data-[active=true]:dark:bg-white/15",
};

const sizeStyles: Record<ButtonSize, string> = {
  none: "",
  xs: "h-6 px-2 text-[11px]",
  sm: "h-7 px-3 text-[12px]",
  md: "h-8 px-4 text-[13px]",
  lg: "h-9 px-5 text-sm",
  "icon-sm": "h-7 w-7 text-[12px]",
  "icon-md": "h-9 w-9 text-sm",
};

const ButtonInner = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "ghost",
      size,
      rounded = "rounded-lg",
      active = false,
      className,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const resolvedSize =
      size ?? (variant === "icon" ? "icon-sm" : "sm");

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        type={type}
        data-active={active ? "true" : "false"}
        className={cn(
          "inline-flex items-center justify-center gap-2 select-none whitespace-nowrap font-medium transition-colors duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:pointer-events-none",
          rounded,
          sizeStyles[resolvedSize],
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);

ButtonInner.displayName = "Button";

export const Button = memo(ButtonInner);
