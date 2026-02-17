// ─── Wallpaper Persistence ──────────────────────────────────────────────────────
// Uses the filesystem via IPC for reliable wallpaper storage.
// This avoids IndexedDB size limits and corruption issues.

/** Save a wallpaper data URL (or null) to disk via main process */
export async function saveWallpaper(dataUrl: string | null): Promise<void> {
  try {
    await window.electronAPI.saveWallpaper(dataUrl)
  } catch (err) {
    console.warn('Failed to save wallpaper:', err)
  }
}

/** Load the wallpaper data URL from disk via main process */
export async function loadWallpaper(): Promise<string | null> {
  try {
    return await window.electronAPI.loadWallpaper()
  } catch (err) {
    console.warn('Failed to load wallpaper:', err)
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
