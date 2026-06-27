export interface Toast {
  id: string
  message: string
  type: 'success' | 'info' | 'error'
  action?: { label: string; onClick: () => void }
  persistent?: boolean
}

let toasts: Toast[] = []
let listeners: Array<() => void> = []

function notify(): void {
  for (const listener of listeners) listener()
}

export function showToast(toast: Omit<Toast, 'id'>): void {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  toasts = [...toasts, { ...toast, id }]
  notify()

  if (toast.persistent) return

  window.setTimeout(() => {
    dismissToast(id)
  }, 5000)
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((toast) => toast.id !== id)
  notify()
}

export function getToastsSnapshot(): Toast[] {
  return toasts
}

export function subscribeToToasts(listener: () => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((item) => item !== listener)
  }
}
