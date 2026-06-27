import { memo, useMemo } from "react";
import loadingSpinnerSvg from "@/assets/loader/LoadingSpinner.svg?raw";
import { cn } from "@/utils/classNames";

function prepareSpinnerSvg(size: number): string {
  return loadingSpinnerSvg
    .replace(/<\?xml[^>]*>\s*/i, "")
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`)
    .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"');
}

function LoadingSpinnerInner({
  size = 32,
  className = "",
  inheritColor = false,
}: {
  size?: number;
  className?: string;
  inheritColor?: boolean;
}): React.JSX.Element {
  const svg = useMemo(() => prepareSpinnerSvg(size), [size]);

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex",
        inheritColor ? "" : "text-[var(--app-text-primary)]",
        className,
      )}
      style={{ width: size, height: size, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export const LoadingSpinner = memo(LoadingSpinnerInner);
