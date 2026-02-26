import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useUIStore } from "@/store/uiStore";

const SNAP_THRESHOLD = 0.025; // Snap when within 2.5% of a snap point
const SNAP_POINTS = [0.333, 0.5, 0.667];
const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;

function snapRatio(ratio: number): number {
  const clamped = Math.max(MIN_RATIO, Math.min(MAX_RATIO, ratio));
  for (const snap of SNAP_POINTS) {
    if (Math.abs(clamped - snap) < SNAP_THRESHOLD) return snap;
  }
  return clamped;
}

function SplitDividerInner(): React.JSX.Element {
  const splitRatio = useUIStore((s) => s.splitRatio);
  const setSplitRatio = useUIStore((s) => s.setSplitRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSnapped, setIsSnapped] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const pendingRatioRef = useRef<number>(splitRatio);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Double-click to reset to 50/50
  const handleDoubleClick = useCallback(() => {
    setSplitRatio(0.5);
  }, [setSplitRatio]);

  useEffect(() => {
    if (!isDragging) return;

    const flushToStore = (): void => {
      setSplitRatio(pendingRatioRef.current);
      rafIdRef.current = null;
    };

    const handleMouseMove = (e: MouseEvent): void => {
      const raw = e.clientX / window.innerWidth;
      const snapped = snapRatio(raw);
      setIsSnapped(snapped !== Math.max(MIN_RATIO, Math.min(MAX_RATIO, raw)));
      pendingRatioRef.current = snapped;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushToStore);
      }
    };

    const handleMouseUp = (): void => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setSplitRatio(pendingRatioRef.current);
      setIsDragging(false);
      setIsSnapped(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isDragging, setSplitRatio]);

  const active = isDragging || isHovered;

  return (
    <>
      {/* Full-screen drag overlay — sits above webviews to prevent them stealing mouse events */}
      {isDragging && (
        <div
          className="fixed inset-0 z-[15]"
          style={{ cursor: "col-resize" }}
        />
      )}
      <div
        ref={containerRef}
        className="absolute top-0 bottom-0 z-[16] flex items-center justify-center"
        style={{
          left: `${splitRatio * 100}%`,
          width: active ? "12px" : "6px",
          transform: "translateX(-50%)",
          cursor: "col-resize",
          transition: isDragging ? undefined : "width 150ms ease",
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Visual line */}
        <div
          className="h-full transition-all duration-150"
          style={{
            width: active ? "3px" : "1px",
            borderRadius: "2px",
            backgroundColor: isSnapped
              ? "rgb(99 102 241 / 0.9)"
              : active
                ? "rgb(99 102 241 / 0.6)"
                : "rgb(156 163 175 / 0.3)",
          }}
        />
        {/* Grab dots */}
        {active && (
          <div className="absolute flex flex-col gap-1 items-center">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-indigo-400/80" />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export const SplitDivider = memo(SplitDividerInner);
