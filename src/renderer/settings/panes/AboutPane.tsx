// ─── About Pane ─────────────────────────────────────────────────────────────

export function AboutPane(): React.JSX.Element {
  const ua = navigator.userAgent
  const chromeMatch = ua.match(/Chrome\/([\d.]+)/)
  const electronMatch = ua.match(/Electron\/([\d.]+)/)
  const chromeVersion = chromeMatch?.[1] ?? 'Unknown'
  const electronVersion = electronMatch?.[1] ?? 'Unknown'

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <h3 className="text-[18px] font-medium text-gray-900 dark:text-white mb-1">Browser</h3>
      <p className="text-[13px] text-gray-500 dark:text-neutral-400 mb-6">Version 1.0.0</p>
      <div className="text-[11px] text-gray-400 dark:text-neutral-500 space-y-1">
        <p>Chromium {chromeVersion}</p>
        <p>Electron {electronVersion}</p>
        <p className="pt-2">Widevine DRM enabled</p>
      </div>
    </div>
  )
}
