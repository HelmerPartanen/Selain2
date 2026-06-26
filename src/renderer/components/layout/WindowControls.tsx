import { memo, useCallback, useEffect, useRef, useState } from "react";

import { m, AnimatePresence } from "motion/react";

import { useSettingsStore } from "@/store/settingsStore";

import { Button } from "@/components/ui/Button";

import { SvgIcon } from "@/components/ui/SvgIcon";

import maximizeSvg from "@/assets/icons/Window/Maximize.svg?raw";

import windowedSvg from "@/assets/icons/Window/Windowed.svg?raw";

import minusSvg from "@/assets/icons/Window/Minimize.svg?raw";

import closeSvg from "@/assets/icons/Window/Close.svg?raw";

import { SPRING_FAST, SPRING_SNAPPY } from "@/utils/springs";

const HIDE_DELAY = 800;

function Win11ControlButton({
  onClick,
  label,
  variant = "default",
  children,
}: {
  onClick: () => void;
  label: string;
  variant?: "default" | "close";
  children: React.ReactNode;
}): React.JSX.Element {
  const hoverClass =
    variant === "close"
      ? "hover:bg-[var(--app-danger)] hover:text-white"
      : "hover:bg-[var(--app-control-hover)]";

  return (
    <Button
      variant="ghost"
      size="none"
      onClick={onClick}
      aria-label={label}
      className={`w-[46px] h-10 flex items-center justify-center rounded-none text-[var(--app-text-primary)] transition-colors duration-75 ${hoverClass}`}
    >
      {children}
    </Button>
  );
}

function FloatingControlButton({
  onClick,
  label,
  variant = "default",
  children,
}: {
  onClick: () => void;
  label: string;
  variant?: "default" | "close";
  children: React.ReactNode;
}): React.JSX.Element {
  const hoverClass =
    variant === "close"
      ? "hover:bg-[var(--app-danger)] hover:text-white"
      : "hover:bg-[var(--app-control-hover)]";

  return (
    <Button
      variant="ghost"
      size="none"
      onClick={onClick}
      aria-label={label}
      transition={SPRING_SNAPPY}
      className={`relative w-9 h-9 flex items-center justify-center rounded-none text-[var(--app-text-primary)] transition-colors duration-75 ${hoverClass}`}
    >
      <span className="relative z-10">{children}</span>
    </Button>
  );
}

function WindowControlsInner({
  embedded = false,
}: {
  embedded?: boolean;
}): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);

  const disableAnimations = useSettingsStore((s) => s.disableAnimations);

  const [isMaximized, setIsMaximized] = useState(false);

  const hideTimerRef = useRef<number>(0);

  useEffect(() => {
    const unsub = window.electronAPI.onMaximizeChange(setIsMaximized);

    return unsub;
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);

      hideTimerRef.current = 0;
    }

    setIsVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);

      hideTimerRef.current = 0;
    }, HIDE_DELAY);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handleMinimize = useCallback(
    () => window.electronAPI.minimizeWindow(),

    [],
  );

  const handleToggleMaximize = useCallback(
    () => window.electronAPI.toggleMaximizeWindow(),

    [],
  );

  const handleClose = useCallback(() => window.electronAPI.closeWindow(), []);

  if (embedded) {
    return (
      <div className="flex items-start [app-region:no-drag] -mr-1 -mt-px">
        <div className="flex items-center">
          <Win11ControlButton onClick={handleMinimize} label="Minimize">
            <SvgIcon svg={minusSvg} size={16} />
          </Win11ControlButton>

          <Win11ControlButton
            onClick={handleToggleMaximize}
            label={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <SvgIcon svg={windowedSvg} size={16} />
            ) : (
              <SvgIcon svg={maximizeSvg} size={16} />
            )}
          </Win11ControlButton>

          <Win11ControlButton
            onClick={handleClose}
            label="Close"
            variant="close"
          >
            <SvgIcon svg={closeSvg} size={16} />
          </Win11ControlButton>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed top-0 right-0 z-[60] [app-region:no-drag]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ pointerEvents: "none" }}
    >
      {/* Trigger zone — top-right corner target for discoverability */}

      <div
        className="absolute top-0 right-0 w-12 h-4"
        style={{ pointerEvents: "auto" }}
      />

      {/* Subtle pulsing hint dots visible when controls are hidden */}

      <AnimatePresence>
        {!isVisible && (
          <m.div
            initial={disableAnimations ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={disableAnimations ? undefined : { opacity: 0 }}
            transition={
              disableAnimations ? { duration: 0 } : { duration: 0.15 }
            }
            className="absolute top-2.5 right-5 flex gap-1.5"
            style={{
              pointerEvents: "auto",
              animation: disableAnimations
                ? "none"
                : "hint-pulse 3s ease-in-out infinite",
            }}
          >
            <div className="w-[5px] h-[5px] rounded-full bg-[var(--app-text-tertiary)]" />

            <div className="w-[5px] h-[5px] rounded-full bg-[var(--app-text-tertiary)]" />

            <div className="w-[5px] h-[5px] rounded-full bg-[var(--app-text-tertiary)]" />
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && (
          <m.div
            className="-mt-0.5 -mr-0.5 rounded-xl flex items-center overflow-hidden bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)]"
            style={{ pointerEvents: "auto" }}
            initial={
              disableAnimations ? undefined : { opacity: 0, scale: 0.85, y: -6 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              disableAnimations
                ? { opacity: 0, scale: 0.85, y: -6 }
                : { opacity: 0, scale: 0.85, y: -6 }
            }
            transition={disableAnimations ? { duration: 0 } : SPRING_FAST}
          >
            <FloatingControlButton onClick={handleMinimize} label="Minimize">
              <SvgIcon svg={minusSvg} size={12} />
            </FloatingControlButton>

            <FloatingControlButton
              onClick={handleToggleMaximize}
              label={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <SvgIcon svg={windowedSvg} size={12} />
              ) : (
                <SvgIcon svg={maximizeSvg} size={12} />
              )}
            </FloatingControlButton>

            <FloatingControlButton
              onClick={handleClose}
              label="Close"
              variant="close"
            >
              <SvgIcon svg={closeSvg} size={12} />
            </FloatingControlButton>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const WindowControls = memo(WindowControlsInner);