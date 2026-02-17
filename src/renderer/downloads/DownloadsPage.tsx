import { memo, useMemo } from 'react'
import { DownloadSimple, FolderOpen, X, Check, Warning, Pause, Play } from '@phosphor-icons/react'
import { useDownloadStore, type DownloadItem } from '@/store/downloadStore'
import { InternalPageLayout } from '@/components/layout/InternalPageLayout'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${sizes[i]}`
}

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
          <Check size={16} className="text-green-500" weight="bold" />
        ) : item.state === 'failed' ? (
          <Warning size={16} className="text-red-500" weight="bold" />
        ) : (
          <DownloadSimple size={16} className="text-blue-500" weight="bold" />
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
            <Pause size={13} weight="bold" />
          </button>
        )}
        {item.state === 'paused' && (
          <button
            onClick={() => resumeDownload(item.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors duration-100"
            aria-label="Resume"
          >
            <Play size={13} weight="bold" />
          </button>
        )}
        {isActive && (
          <button
            onClick={() => cancelDownload(item.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-100"
            aria-label="Cancel"
          >
            <X size={13} weight="bold" />
          </button>
        )}
        {item.state === 'completed' && (
          <>
            <button
              onClick={() => openDownload(item.id)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors duration-100"
              aria-label="Open"
            >
              <DownloadSimple size={13} weight="bold" />
            </button>
            <button
              onClick={() => showInFolder(item.id)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors duration-100"
              aria-label="Show in folder"
            >
              <FolderOpen size={13} weight="bold" />
            </button>
          </>
        )}
        {(item.state === 'completed' || item.state === 'failed' || item.state === 'cancelled') && (
          <button
            onClick={() => removeDownload(item.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-100"
            aria-label="Remove from list"
          >
            <X size={13} weight="bold" />
          </button>
        )}
      </div>
    </div>
  )
})

function DownloadsPageInner(): React.JSX.Element {
  const downloads = useDownloadStore((s) => s.downloads)
  const items = useMemo(() =>
    Object.values(downloads).sort((a, b) => b.startTime - a.startTime),
    [downloads]
  )

  return (
    <InternalPageLayout title="Downloads">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-neutral-600">
          <DownloadSimple size={40} weight="regular" className="mb-3 opacity-50" />
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
    </InternalPageLayout>
  )
}

export const DownloadsPage = memo(DownloadsPageInner)
