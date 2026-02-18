// ─── IPC Storage Adapter ─────────────────────────────────────────────────────
// Zustand-compatible PersistStorage that persists state via IPC to the main
// process filesystem (userData directory). Transparently migrates existing
// data from localStorage on first read, then removes the localStorage entry.

import { createJSONStorage } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'

function createIPCStateStorage(): StateStorage {
  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        // Try filesystem (IPC) first
        const data = await window.electronAPI.loadStore(name)
        if (data !== null) return data

        // Migration: seed from localStorage if the IPC file doesn't exist yet.
        // Only remove the localStorage entry after confirming the save succeeded
        // to prevent data loss if the main process rejects the write.
        const local = localStorage.getItem(name)
        if (local !== null) {
          const saved = await window.electronAPI.saveStore(name, local)
          if (saved) localStorage.removeItem(name)
          return local
        }

        return null
      } catch {
        // Fallback to localStorage if IPC is unavailable (e.g. dev tooling)
        return localStorage.getItem(name)
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      try {
        await window.electronAPI.saveStore(name, value)
      } catch {
        // Fallback so settings are never silently lost
        localStorage.setItem(name, value)
      }
    },

    removeItem: async (name: string): Promise<void> => {
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

/** Creates zustand-compatible PersistStorage backed by the main process filesystem */
export function createIPCStorage<S>() {
  return createJSONStorage<S>(() => createIPCStateStorage())
}
