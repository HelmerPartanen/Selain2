// ─── Wallpaper IndexedDB Storage ─────────────────────────────────────────────
// Stores wallpaper images in IndexedDB instead of localStorage to avoid
// the ~5MB localStorage limit and reduce JSON serialization overhead.

const DB_NAME = 'browser-wallpaper'
const DB_VERSION = 1
const STORE_NAME = 'wallpapers'
const KEY = 'current'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Save a wallpaper data URL (or null) to IndexedDB */
export async function saveWallpaper(dataUrl: string | null): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    if (dataUrl === null) {
      store.delete(KEY)
    } else {
      store.put(dataUrl, KEY)
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (err) {
    console.warn('Failed to save wallpaper to IndexedDB:', err)
  }
}

/** Load the wallpaper data URL from IndexedDB */
export async function loadWallpaper(): Promise<string | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(KEY)
    const result = await new Promise<string | null>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as string) ?? null)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return result
  } catch (err) {
    console.warn('Failed to load wallpaper from IndexedDB:', err)
    return null
  }
}

/** Convert a data URL to a blob URL for efficient CSS rendering */
export function dataUrlToBlobUrl(dataUrl: string): string {
  try {
    const [header, base64] = dataUrl.split(',')
    if (!header || !base64) return dataUrl
    const mimeMatch = header.match(/data:([^;]+)/)
    const mime = mimeMatch?.[1] ?? 'image/png'
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: mime })
    return URL.createObjectURL(blob)
  } catch {
    return dataUrl
  }
}
