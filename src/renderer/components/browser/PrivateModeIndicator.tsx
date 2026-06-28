import { memo, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { SvgIcon } from "@/components/ui/SvgIcon";
import privateSvg from "@/assets/icons/Interface/Private.svg?raw";
import { useFocusedTabIsPrivate } from "@/hooks/useTabSelector";
import { useTabStore } from "@/store/tabStore";

function PrivateModeIndicatorInner(): React.JSX.Element | null {
  const isPrivate = useFocusedTabIsPrivate();

  const handleExit = useCallback(() => {
    useTabStore.getState().exitPrivateMode();
  }, []);

  if (!isPrivate) return null;

  return (
    <div className="flex h-full items-center gap-1 rounded-lg bg-[var(--app-bg-tertiary)] px-2 text-[var(--app-text-primary)]">
      <span className="flex items-center gap-1.5 text-[12px] font-medium">
        <SvgIcon svg={privateSvg} size={14} />
      </span>
      <Button
        variant="ghost"
        size="xs"
        onClick={handleExit}
        aria-label="Exit private mode"
      >
        Exit
      </Button>
    </div>
  );
}

export const PrivateModeIndicator = memo(PrivateModeIndicatorInner);
