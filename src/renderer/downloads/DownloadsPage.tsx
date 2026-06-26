import { memo, useMemo, useState } from 'react'
import { m } from 'motion/react'
import { Button } from '@/components/ui/Button'
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
import { SPRING_LIST } from '@/utils/springs'

function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`
}

const DownloadRow = memo(function DownloadRow({ item, index }: { item: DownloadItem; index: number }): React.JSX.Element {
  const { pauseDownload, resumeDownload, cancelDownload, openDownload, showInFolder, removeDownload } = useDownloadStore.getState()
  const progress = item.totalBytes > 0 ? item.receivedBytes / item.totalBytes : 0
  const isActive = item.state === 'progressing' || item.state === 'paused'
  const [hovered, setHovered] = useState(false)

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_LIST, delay: index * 0.03 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => { /* clicking row opens handled by parent if needed */ }}
      className="relative group flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer transition-all duration-150"
    >

      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 overflow-hidden z-10">
        {item.state === 'completed' ? (
          <SvgIcon svg={checkSvg} size={28} className="text-green-500" />
        ) : item.state === 'failed' ? (
          <SvgIcon svg={warnSvg} size={28} className="text-red-500" />
        ) : (
          <SvgIcon svg={downloadSvg} size={28} className="text-blue-500" />
        )}
      </div>

      <div className="flex-1 min-w-0 z-10">
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

      <div className="flex items-center gap-1 flex-shrink-0 z-10">
        {item.state === 'progressing' && (
          <Button
            variant="icon"
            rounded="rounded-full"
            onClick={() => pauseDownload(item.id)}
            aria-label="Pause"
          >
            <SvgIcon svg={PAUSE_SVG} size={13} />
          </Button>
        )}
        {item.state === 'paused' && (
          <Button
            variant="icon"
            rounded="rounded-full"
            onClick={() => resumeDownload(item.id)}
            aria-label="Resume"
          >
            <SvgIcon svg={playSvg} size={13} />
          </Button>
        )}
        {isActive && (
          <Button
            variant="danger"
            size="icon-sm"
            rounded="rounded-full"
            onClick={() => cancelDownload(item.id)}
            aria-label="Cancel"
          >
            <SvgIcon svg={closeSvg} size={13} />
          </Button>
        )}
        {item.state === 'completed' && (
          <>
            <Button
              variant="icon"
              rounded="rounded-full"
              onClick={() => openDownload(item.id)}
              aria-label="Open"
            >
              <SvgIcon svg={downloadSvg} size={13} />
            </Button>
            <Button
              variant="icon"
              rounded="rounded-full"
              onClick={() => showInFolder(item.id)}
              aria-label="Show in folder"
            >
              <SvgIcon svg={folderSvg} size={13} />
            </Button>
          </>
        )}
        {(item.state === 'completed' || item.state === 'failed' || item.state === 'cancelled') && (
          <Button
            variant="danger"
            size="icon-sm"
            rounded="rounded-full"
            onClick={() => removeDownload(item.id)}
            className="opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Remove from list"
          >
            <SvgIcon svg={closeSvg} size={13} />
          </Button>
        )}
      </div>
    </m.div>
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
      className="flex flex-col"
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 className="text-[15px] font-medium text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <SvgIcon svg={downloadSvg} size={16} />
          Downloads
        </h2>
        <Button
          variant="icon"
          rounded="rounded-full"
          onClick={closeDownloads}
          aria-label="Close downloads"
        >
          <SvgIcon svg={closeSvg} size={13} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 glass-scroll">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-neutral-600">
            <SvgIcon svg={downloadSvg} size={40} className="mb-3 opacity-50" />
            <p className="text-sm">No downloads</p>
            <p className="text-xs mt-1 opacity-70">Downloads from this session will appear here</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {items.map((item, i) => (
              <DownloadRow key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </div>
    </PanelModal>
  )
}

export const DownloadsPanel = memo(DownloadsPanelInner)
