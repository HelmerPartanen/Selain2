import { useEffect } from 'react'

/**
 * Fires `onEscape` when the Escape key is pressed.
 * Safe to mount multiple times — each instance gets its own listener.
 */
export function useEscapeKey(onEscape: () => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onEscape])
}
