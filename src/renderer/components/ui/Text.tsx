import { type HTMLAttributes } from "react";
import { cn } from "@/utils/classNames";

type TextTone = "primary" | "secondary" | "muted" | "danger" | "accent";
type TextSize = "caption" | "body" | "label" | "title";

interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: "p" | "span" | "div" | "h2" | "h3";
  tone?: TextTone;
  size?: TextSize;
}

const tones: Record<TextTone, string> = {
  primary: "text-[var(--app-text-primary)]",
  secondary: "text-[var(--app-text-secondary)]",
  muted: "text-[var(--app-text-tertiary)]",
  danger: "text-[var(--app-danger)]",
  accent: "text-[var(--app-accent)]",
};

const sizes: Record<TextSize, string> = {
  caption: "text-[12px] font-light leading-relaxed",
  body: "text-[13px] font-normal leading-relaxed",
  label: "text-[14px] font-medium leading-snug",
  title: "text-[15px] font-medium tracking-relaxed leading-snug",
};

export function Text({
  as: Component = "p",
  tone = "secondary",
  size = "body",
  className,
  ...props
}: TextProps): React.JSX.Element {
  return (
    <Component
      className={cn(sizes[size], tones[tone], className)}
      {...props}
    />
  );
}
