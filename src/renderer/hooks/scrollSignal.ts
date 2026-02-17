type ScrollCallback = (isScrolling: boolean) => void

const listeners = new Set<ScrollCallback>()

export function emitScroll(isScrolling: boolean): void {
  for (const cb of listeners) cb(isScrolling)
}

export function subscribeScroll(cb: ScrollCallback): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
