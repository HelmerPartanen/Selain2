import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/utils/classNames";

type CardVariant = "plain" | "surface" | "interactive" | "elevated";
type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

const variants: Record<CardVariant, string> = {
  plain: "bg-transparent",
  surface:
    "bg-[var(--app-bg-tertiary)] text-[var(--app-text-primary)]",
  interactive:
    "bg-[var(--app-grouped-bg-secondary)] hover:bg-[var(--app-control-hover)] text-[var(--app-text-primary)] transition-colors duration-150",
  elevated:
    "bg-[var(--app-bg-tertiary)] text-[var(--app-text-primary)] border border-[var(--app-separator)]",
};

const paddings: Record<CardPadding, string> = {
  none: "",
  sm: "p-2",
  md: "p-3.5",
  lg: "p-5",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "surface", padding = "md", className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl", variants[variant], paddings[padding], className)}
      {...props}
    />
  ),
);

Card.displayName = "Card";

interface SheetProps extends HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export const Sheet = forwardRef<HTMLDivElement, SheetProps>(
  ({ inset = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl bg-[var(--app-grouped-bg-secondary)] border border-[var(--app-separator)] text-[var(--app-text-primary)]",
        inset && "p-1",
        className,
      )}
      {...props}
    />
  ),
);

Sheet.displayName = "Sheet";
