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
    "bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06]",
  interactive:
    "bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-150",
  elevated:
    "bg-white dark:bg-[#1D1F23] border border-black/[0.06] dark:border-white/[0.06] shadow-sm",
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
        "rounded-xl bg-white dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06]",
        inset && "p-1",
        className,
      )}
      {...props}
    />
  ),
);

Sheet.displayName = "Sheet";
