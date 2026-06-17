/** Direction-aware vertical animation offsets for popovers. */
export function getPopoverMotion(popoverBelow: boolean): { enterY: number; exitY: number } {
  const offset = 10
  return {
    enterY: popoverBelow ? -offset : offset,
    exitY: popoverBelow ? -offset : offset,
  }
}

/** Clamp a popover's left edge so it stays within the viewport. */
export function clampPopoverLeft(triggerRect: DOMRect, popoverWidth: number): number {
  const centerX = triggerRect.left + triggerRect.width / 2
  const half = popoverWidth / 2
  const minLeft = 8
  const maxLeft = window.innerWidth - popoverWidth - 8
  return Math.max(minLeft, Math.min(centerX - half, maxLeft))
}

/** Clamp a popover's top edge so it stays within the viewport. */
export function clampPopoverTop(
  triggerRect: DOMRect,
  popoverHeight: number,
  popoverBelow: boolean,
): number {
  const gap = 8
  if (popoverBelow) {
    const top = triggerRect.bottom + gap
    return Math.min(top, window.innerHeight - popoverHeight - 8)
  }
  const top = triggerRect.top - popoverHeight - gap
  return Math.max(8, top)
}
