// ─── About Pane ─────────────────────────────────────────────────────────────

import { memo } from 'react'

function AboutPaneInner(): React.JSX.Element {
  const ua = navigator.userAgent
  const chromeMatch = ua.match(/Chrome\/([\d.]+)/)
  const electronMatch = ua.match(/Electron\/([\d.]+)/)
  const chromeVersion = chromeMatch?.[1] ?? 'Unknown'
  const electronVersion = electronMatch?.[1] ?? 'Unknown'

  return (
    <div className="flex flex-col items-center justify-center h-full py-6 text-center">
      <h3 className="text-[18px] font-medium text-gray-900 dark:text-white mb-0.5 tracking-tight">Browser</h3>
      <p className="text-[13px] text-gray-400 dark:text-neutral-500 mb-8">Version {__APP_VERSION__}</p>
      <div className="inline-flex flex-col gap-2 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] p-4 min-w-[200px]">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-gray-400 dark:text-neutral-500">Chromium</span>
          <span className="text-gray-600 dark:text-neutral-300 tabular-nums">{chromeVersion}</span>
        </div>
        <div className="h-px bg-black/[0.04] dark:bg-white/[0.04]" />
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-gray-400 dark:text-neutral-500">Electron</span>
          <span className="text-gray-600 dark:text-neutral-300 tabular-nums">{electronVersion}</span>
        </div>
        <div className="h-px bg-black/[0.04] dark:bg-white/[0.04]" />
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-gray-400 dark:text-neutral-500">DRM</span>
          <span className="text-gray-600 dark:text-neutral-300">Widevine</span>
        </div>
      </div>
    </div>
  )
}

export const AboutPane = memo(AboutPaneInner);
