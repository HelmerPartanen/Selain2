import {
  forwardRef,
  memo,
} from "react";
import { m, type HTMLMotionProps } from "motion/react";
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
    "text-[var(--app-text-secondary)] bg-transparent hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)] focus:none",
  solid:
    "text-[var(--app-accent)] bg-[var(--app-accent-bg)] hover:bg-[var(--app-accent-bg-hover)]",
  subtle:
    "text-[var(--app-text-primary)] bg-[var(--app-bg-secondary)] hover:bg-[var(--app-control-active)]",
  primary:
    "text-white bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)]",
  danger:
    "text-[var(--app-danger)] bg-[var(--app-danger-bg)] hover:bg-[var(--app-danger-hover-bg)]",
  icon:
    "text-[var(--app-text-secondary)] bg-transparent hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text-primary)]",
  link:
    "text-[var(--app-accent)] bg-transparent hover:underline",
  segment:
    "text-[var(--app-text-secondary)] hover:text-[var(--app-text-secondary)] data-[active=true]:text-[var(--app-text-primary)] data-[active=true]:bg-[var(--app-bg-quaternary)]",
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
      <m.button
        ref={ref}
        disabled={disabled}
        type={type}
        data-active={active ? "true" : "false"}
        className={cn(
          "inline-flex items-center justify-center gap-2 select-none whitespace-nowrap font-medium transition-colors duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg-primary)]",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:pointer-events-none",
          rounded,
          sizeStyles[resolvedSize],
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        {children}
      </m.button>
    );
  },
);

ButtonInner.displayName = "Button";

export const Button = memo(ButtonInner);
