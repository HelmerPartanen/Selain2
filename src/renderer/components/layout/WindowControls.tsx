import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SvgIcon, SQUARE_SVG, CARDS_SVG } from "@/components/ui/SvgIcon";
import minusSvg from "@/assets/icons/Maths/Minus.svg?raw";
import closeSvg from "@/assets/icons/Interface/Close_Cross.svg?raw";
import { SPRING_FAST, SPRING_SNAPPY } from "@/utils/springs";

const HIDE_DELAY = 800;

function WindowControlsInner(): React.JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute top-2.5 right-5 flex gap-1.5"
            style={{ pointerEvents: "auto", animation: "hint-pulse 3s ease-in-out infinite" }}
          >
            <div className="w-[5px] h-[5px] rounded-full bg-gray-400 dark:bg-neutral-500" />
            <div className="w-[5px] h-[5px] rounded-full bg-gray-400 dark:bg-neutral-500" />
            <div className="w-[5px] h-[5px] rounded-full bg-gray-400 dark:bg-neutral-500" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="mt-2.5 mr-2.5 flex items-center rounded-full glass p-1"
            style={{ pointerEvents: "auto" }}
            initial={{ opacity: 0, scale: 0.85, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -6 }}
            transition={SPRING_FAST}
          >
            <ControlButton
              onClick={handleMinimize}
              label="Minimize"
              hoverBg="hover:bg-gray-200/30 dark:hover:bg-neutral-700/40"
              hoverText="hover:text-gray-600 dark:hover:text-gray-300"
            >
              <SvgIcon svg={minusSvg} size={12} />
            </ControlButton>

            <ControlButton
              onClick={handleToggleMaximize}
              label={isMaximized ? "Restore" : "Maximize"}
              hoverBg="hover:bg-gray-200/30 dark:hover:bg-neutral-700/30"
              hoverText="hover:text-gray-600 dark:hover:text-gray-300"
            >
              {isMaximized ? (
                <SvgIcon svg={CARDS_SVG} size={12} />
              ) : (
                <SvgIcon svg={SQUARE_SVG} size={10} />
              )}
            </ControlButton>

            <ControlButton
              onClick={handleClose}
              label="Close"
              hoverBg="hover:bg-red-500/15 dark:hover:bg-red-400/10"
              hoverText="hover:text-red-500 dark:hover:text-red-400"
            >
              <SvgIcon svg={closeSvg} size={12} />
            </ControlButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  hoverBg,
  hoverText,
  children,
}: {
  onClick: () => void;
  label: string;
  hoverBg: string;
  hoverText: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.button
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.78 }}
      transition={SPRING_SNAPPY}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative w-7 h-7 rounded-full flex items-center justify-center text-gray-500 dark:text-neutral-400 transition-colors duration-100 ${hoverBg} ${hoverText}`}
    >
      {hovered && (
        <motion.div
          layoutId="window-controls-hover"
          className="absolute inset-0 rounded-full glass bg-white/20 dark:bg-white/6 shadow ring-1 ring-black/5 dark:ring-white/10"
          initial={{ opacity: 0.5, filter: 'blur(2px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(2px)' }}
          transition={SPRING_SNAPPY}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

export const WindowControls = memo(WindowControlsInner);
