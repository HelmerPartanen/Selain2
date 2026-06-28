import { memo, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PanelModal } from '@/components/ui/PanelModal'
import { PanelHeader, EmptyState } from '@/components/ui/PanelParts'
import { SvgIcon, PAUSE_SVG } from '@/components/ui/SvgIcon'
import { Text } from '@/components/ui/Text'
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
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="relative group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-100 hover:bg-[var(--app-control-hover)] focus-within:bg-[var(--app-control-hover)]"
    >

      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 overflow-hidden z-10">
        {item.state === 'completed' ? (
          <SvgIcon svg={checkSvg} size={24} className="text-[var(--app-success)]" />
        ) : item.state === 'failed' ? (
          <SvgIcon svg={warnSvg} size={24} className="text-[var(--app-danger)]" />
        ) : (
          <SvgIcon svg={downloadSvg} size={24} className="text-[var(--app-accent)]" />
        )}
      </div>

      <div className="flex-1 min-w-0 z-10">
        <Text as="div" size="body" tone="primary" className="truncate font-medium">
          {item.filename}
        </Text>
        <div className="flex items-center gap-2 mt-0.5">
          {isActive && (
            <>
              <div className="flex-1 h-1 rounded-full bg-[var(--app-control-active)] overflow-hidden max-w-[200px]">
                <div
                  className="h-full bg-[var(--app-accent)] rounded-full transition-[width] duration-150"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <Text as="span" size="caption" tone="muted" className="text-[11px] tabular-nums">
                {formatBytes(item.receivedBytes)} / {item.totalBytes > 0 ? formatBytes(item.totalBytes) : '?'}
              </Text>
              {item.state === 'progressing' && item.speed > 0 && (
                <Text as="span" size="caption" tone="tertiary" className="text-[11px] tabular-nums">
                  {formatSpeed(item.speed)}
                </Text>
              )}
            </>
          )}
          {item.state === 'completed' && (
            <Text as="span" size="caption" tone="muted" className="text-[11px]">
              {formatBytes(item.totalBytes)} - Done
            </Text>
          )}
          {item.state === 'failed' && (
            <Text as="span" size="caption" tone="danger" className="text-[11px]">Download failed</Text>
          )}
          {item.state === 'cancelled' && (
            <Text as="span" size="caption" tone="tertiary" className="text-[11px]">Cancelled</Text>
          )}
          {item.state === 'paused' && (
            <Text as="span" size="caption" tone="accent" className="text-[11px]">Paused</Text>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 z-10">
        {item.state === 'progressing' && (
          <Button
            variant="icon"
            rounded="rounded-full"
            onClick={() => pauseDownload(item.id)}
            aria-label="Pause download"
          >
            <SvgIcon svg={PAUSE_SVG} size={13} />
          </Button>
        )}
        {item.state === 'paused' && (
          <Button
            variant="icon"
            rounded="rounded-full"
            onClick={() => resumeDownload(item.id)}
            aria-label="Resume download"
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
            aria-label="Cancel download"
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
              aria-label="Open file"
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
            className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label="Remove from list"
          >
            <SvgIcon svg={closeSvg} size={13} />
          </Button>
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
      className="flex flex-col"
    >
      <PanelHeader
        icon={downloadSvg}
        title="Downloads"
        onClose={closeDownloads}
        closeLabel="Close downloads"
      />

      <div className="flex-1 overflow-y-auto px-5 py-3 glass-scroll">
        {items.length === 0 ? (
          <EmptyState
            icon={downloadSvg}
            title="No downloads yet"
            description="Files you download will appear here."
            className="py-20"
          />
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
