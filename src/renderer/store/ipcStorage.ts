// ─── IPC Storage Adapter ─────────────────────────────────────────────────────
// Zustand-compatible PersistStorage that persists state via IPC to the main
// process filesystem (userData directory). Transparently migrates existing
// data from localStorage on first read, then removes the localStorage entry.

import { createJSONStorage } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'
import { logger } from '@/utils/logger'

const WRITE_DEBOUNCE_MS = 350
const PERF_LOGS = import.meta.env.DEV && localStorage.getItem('perf.ipcStorage') === '1'

type PendingWrite = {
  value: string
  timerId: number | null
  flushPromise: Promise<void> | null
}

const pendingWrites = new Map<string, PendingWrite>()
const lastSavedByStore = new Map<string, string>()
const inFlightByStore = new Set<string>()

const perf = {
  queued: 0,
  flushed: 0,
  skippedNoChange: 0,
  ipcFailures: 0,
  fallbackWrites: 0
}

let perfTimerStarted = false

function startPerfTimer(): void {
  if (!PERF_LOGS || perfTimerStarted) return
  perfTimerStarted = true
  window.setInterval(() => {
    logger.log('[perf][ipcStorage]', {
      ...perf,
      pendingStores: pendingWrites.size,
      inFlightStores: inFlightByStore.size
    })
  }, 10000)
}

async function flushStoreWrite(name: string): Promise<void> {
  const pending = pendingWrites.get(name)
  if (!pending) return
  if (inFlightByStore.has(name)) return

  const nextValue = pending.value
  const lastSaved = lastSavedByStore.get(name)
  if (lastSaved === nextValue) {
    perf.skippedNoChange += 1
    pendingWrites.delete(name)
    return
  }

  inFlightByStore.add(name)
  try {
    await window.electronAPI.saveStore(name, nextValue)
    lastSavedByStore.set(name, nextValue)
    perf.flushed += 1
  } catch {
    perf.ipcFailures += 1
    localStorage.setItem(name, nextValue)
    perf.fallbackWrites += 1
  } finally {
    inFlightByStore.delete(name)

    const latest = pendingWrites.get(name)
    // If a newer value arrived during in-flight save, flush again immediately.
    if (latest && latest.value !== nextValue) {
      latest.flushPromise = flushStoreWrite(name)
    } else {
      pendingWrites.delete(name)
    }
  }
}

function scheduleStoreWrite(name: string, value: string): Promise<void> {
  startPerfTimer()
  perf.queued += 1

  const existing = pendingWrites.get(name)
  if (existing && existing.timerId !== null) {
    window.clearTimeout(existing.timerId)
  }

  const pending: PendingWrite = {
    value,
    timerId: null,
    flushPromise: null
  }

  pending.timerId = window.setTimeout(() => {
    const latest = pendingWrites.get(name)
    if (!latest) return
    latest.timerId = null
    latest.flushPromise = flushStoreWrite(name)
  }, WRITE_DEBOUNCE_MS)

  pendingWrites.set(name, pending)
  return Promise.resolve()
}

function createIPCStateStorage(onParseError?: (storeName: string) => void): StateStorage {
  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        // Try filesystem (IPC) first
        const data = await window.electronAPI.loadStore(name)
        if (data !== null) {
          lastSavedByStore.set(name, data)
          // Validate JSON so corrupt persisted state doesn't crash rehydration
          try {
            JSON.parse(data)
          } catch {
            onParseError?.(name)
            return null
          }
          return data
        }

        // Migration: seed from localStorage if the IPC file doesn't exist yet.
        const local = localStorage.getItem(name)
        if (local !== null) {
          const saved = await window.electronAPI.saveStore(name, local)
          if (saved) {
            lastSavedByStore.set(name, local)
            localStorage.removeItem(name)
          }
          return local
        }

        return null
      } catch {
        // Fallback to localStorage if IPC is unavailable (e.g. dev tooling)
        return localStorage.getItem(name)
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      await scheduleStoreWrite(name, value)
    },

    removeItem: async (name: string): Promise<void> => {
      const pending = pendingWrites.get(name)
      if (pending && pending.timerId !== null) {
        window.clearTimeout(pending.timerId)
      }
      pendingWrites.delete(name)
      lastSavedByStore.set(name, 'null')

      try {
        // Write JSON null so that JSON.parse succeeds on next read and
        // Zustand treats the value as "no persisted state" (falls back to defaults).
        await window.electronAPI.saveStore(name, 'null')
      } catch {
        // no-op
      }
      localStorage.removeItem(name)
    }
  }
}

export interface CreateIPCStorageOptions {
  /** Called when persisted JSON is corrupt; use to show a toast or log. */
  onParseError?: (storeName: string) => void
}

/** Creates zustand-compatible PersistStorage backed by the main process filesystem */
export function createIPCStorage<S>(options?: CreateIPCStorageOptions) {
  return createJSONStorage<S>(() =>
    createIPCStateStorage(options?.onParseError)
  )
}
