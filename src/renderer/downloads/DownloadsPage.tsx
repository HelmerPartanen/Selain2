import { memo, useMemo } from 'react'
import { PanelModal } from '@/components/ui/PanelModal'
import { SvgIcon, PAUSE_SVG } from '@/components/ui/SvgIcon'
import downloadSvg from '@/assets/icons/Objects/Tray_Arrow_Down.svg?raw'
import folderSvg from '@/assets/icons/Objects/Folder.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import checkSvg from '@/assets/icons/Interface/Check.svg?raw'
import warnSvg from '@/assets/icons/Interface/Warn_Triangle.svg?raw'
import playSvg from '@/assets/icons/Arrows/Triangle_Forward_Fill.svg?raw'
import { useDownloadStore, type DownloadItem } from '@/store/downloadStore'
import { useUIStore } from '@/store/uiStore'
import { formatBytes } from '@/utils/formatUtils'

function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`
}

const DownloadRow = memo(function DownloadRow({ item }: { item: DownloadItem }): React.JSX.Element {
  const { pauseDownload, resumeDownload, cancelDownload, openDownload, showInFolder, removeDownload } = useDownloadStore.getState()
  const progress = item.totalBytes > 0 ? item.receivedBytes / item.totalBytes : 0
  const isActive = item.state === 'progressing' || item.state === 'paused'

  return (
    <div className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800/60 transition-colors duration-100">
      <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
        {item.state === 'completed' ? (
          <SvgIcon svg={checkSvg} size={16} className="text-green-500" />
        ) : item.state === 'failed' ? (
          <SvgIcon svg={warnSvg} size={16} className="text-red-500" />
        ) : (
          <SvgIcon svg={downloadSvg} size={16} className="text-blue-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {item.filename}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {isActive && (
            <>
              <div className="flex-1 h-1 rounded-full bg-gray-200 dark:bg-neutral-700 overflow-hidden max-w-[200px]">
                <div
                  className="h-full bg-blue-500 rounded-full transition-[width] duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-gray-500 dark:text-neutral-500 tabular-nums">
                {formatBytes(item.receivedBytes)} / {item.totalBytes > 0 ? formatBytes(item.totalBytes) : '?'}
              </span>
              {item.state === 'progressing' && item.speed > 0 && (
                <span className="text-[11px] text-gray-400 dark:text-neutral-600 tabular-nums">
                  {formatSpeed(item.speed)}
                </span>
              )}
            </>
          )}
          {item.state === 'completed' && (
            <span className="text-[11px] text-gray-500 dark:text-neutral-500">
              {formatBytes(item.totalBytes)} — Done
            </span>
          )}
          {item.state === 'failed' && (
            <span className="text-[11px] text-red-500">Download failed</span>
          )}
          {item.state === 'cancelled' && (
            <span className="text-[11px] text-gray-400 dark:text-neutral-600">Cancelled</span>
          )}
          {item.state === 'paused' && (
            <span className="text-[11px] text-amber-500">Paused</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {item.state === 'progressing' && (
          <button
            onClick={() => pauseDownload(item.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors duration-100"
            aria-label="Pause"
          >
            <SvgIcon svg={PAUSE_SVG} size={13} />
          </button>
        )}
        {item.state === 'paused' && (
          <button
            onClick={() => resumeDownload(item.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors duration-100"
            aria-label="Resume"
          >
            <SvgIcon svg={playSvg} size={13} />
          </button>
        )}
        {isActive && (
          <button
            onClick={() => cancelDownload(item.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-100"
            aria-label="Cancel"
          >
            <SvgIcon svg={closeSvg} size={13} />
          </button>
        )}
        {item.state === 'completed' && (
          <>
            <button
              onClick={() => openDownload(item.id)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors duration-100"
              aria-label="Open"
            >
              <SvgIcon svg={downloadSvg} size={13} />
            </button>
            <button
              onClick={() => showInFolder(item.id)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors duration-100"
              aria-label="Show in folder"
            >
              <SvgIcon svg={folderSvg} size={13} />
            </button>
          </>
        )}
        {(item.state === 'completed' || item.state === 'failed' || item.state === 'cancelled') && (
          <button
            onClick={() => removeDownload(item.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-100"
            aria-label="Remove from list"
          >
            <SvgIcon svg={closeSvg} size={13} />
          </button>
        )}
      </div>
    </div>
  )
})

function DownloadsPanelInner(): React.JSX.Element {
  const downloads = useDownloadStore((s) => s.downloads)
  const items = useMemo(() => Object.values(downloads).sort((a, b) => b.startTime - a.startTime), [downloads])
  const closeDownloads = useUIStore((s) => s.closeDownloads)

  return (
    <PanelModal
      onClose={closeDownloads}
      width="520px"
      height="440px"
      className="bg-white dark:bg-neutral-900 flex flex-col"
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-neutral-800 flex-shrink-0">
            <h2 className="text-[15px] font-medium text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <SvgIcon svg={downloadSvg} size={16} />
              Downloads
            </h2>
            <button
              onClick={closeDownloads}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-150"
            >
              <SvgIcon svg={closeSvg} size={13} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-neutral-600">
                <SvgIcon svg={downloadSvg} size={40} className="mb-3 opacity-50" />
                <p className="text-sm">No downloads</p>
                <p className="text-xs mt-1 opacity-70">Downloads from this session will appear here</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {items.map((item) => (
                  <DownloadRow key={item.id} item={item} />
                ))}
              </div>
            )}
      </div>
    </PanelModal>
  )
}

export const DownloadsPanel = memo(DownloadsPanelInner)
