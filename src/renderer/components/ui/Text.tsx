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
  primary: "text-gray-900 dark:text-white",
  secondary: "text-gray-700 dark:text-neutral-300",
  muted: "text-gray-400 dark:text-neutral-500",
  danger: "text-red-600 dark:text-red-400",
  accent: "text-blue-600 dark:text-blue-400",
};

const sizes: Record<TextSize, string> = {
  caption: "text-[11px] leading-relaxed",
  body: "text-[13px] leading-relaxed",
  label: "text-[13px] font-medium leading-snug",
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
