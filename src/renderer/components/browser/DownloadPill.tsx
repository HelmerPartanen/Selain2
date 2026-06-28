import { memo, useCallback, useMemo, useRef, useEffect, useLayoutEffect, useState } from 'react'
import { m, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { SvgIcon, PAUSE_SVG } from '@/components/ui/SvgIcon'
import { Text } from '@/components/ui/Text'
import downloadSvg from '@/assets/icons/Objects/Tray_Arrow_Down.svg?raw'
import checkSvg from '@/assets/icons/Interface/Check.svg?raw'
import playSvg from '@/assets/icons/Arrows/Triangle_Forward_Fill.svg?raw'
import closeSvg from '@/assets/icons/Interface/Close_Cross.svg?raw'
import folderSvg from '@/assets/icons/Objects/Folder.svg?raw'
import { useDownloadStore, type DownloadItem } from '@/store/downloadStore'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { formatBytes } from '@/utils/formatUtils'
import { clampPopoverTop, getPopoverMotion } from '@/utils/popoverPosition'

import { SPRING_EXPAND } from '@/utils/springs'

const DOWNLOAD_POPOVER_WIDTH = 300
const DOWNLOAD_POPOVER_HEIGHT = 320

const DownloadRow = memo(function DownloadRow({ item }: { item: DownloadItem }): React.JSX.Element {
  const { pauseDownload, resumeDownload, cancelDownload, openDownload, showInFolder, removeDownload } = useDownloadStore.getState()
  const progress = item.totalBytes > 0 ? item.receivedBytes / item.totalBytes : 0
  const isActive = item.state === 'progressing' || item.state === 'paused'

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--app-control-hover)] transition-colors duration-75 group">
      <div className="w-7 h-7 rounded-md bg-[var(--app-bg-secondary)] flex items-center justify-center flex-shrink-0">
        {item.state === 'completed' ? (
          <SvgIcon svg={checkSvg} size={12} className="text-[var(--app-success)]" />
        ) : (
          <SvgIcon svg={downloadSvg} size={12} className="text-[var(--app-accent)]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Text as="div" size="caption" tone="primary" className="truncate text-[12px] font-medium">
          {item.filename}
        </Text>
        {isActive && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 h-[3px] rounded-full bg-[var(--app-control-active)] overflow-hidden">
              <div
                className="h-full bg-[var(--app-accent)] rounded-full transition-[width] duration-150"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <Text as="span" size="caption" tone="muted" className="text-[10px] tabular-nums flex-shrink-0">
              {Math.round(progress * 100)}%
            </Text>
          </div>
        )}
        {item.state === 'completed' && (
          <Text as="div" size="caption" tone="muted" className="mt-0.5 text-[10px]">
            {formatBytes(item.totalBytes)}
          </Text>
        )}
        {item.state === 'failed' && (
          <Text as="div" size="caption" tone="danger" className="mt-0.5 text-[10px]">Failed</Text>
        )}
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        {item.state === 'progressing' && (
          <Button
            variant="icon"
            size="xs"
            rounded="rounded-full"
            onClick={() => pauseDownload(item.id)}
            aria-label="Pause"
          >
            <SvgIcon svg={PAUSE_SVG} size={11} />
          </Button>
        )}
        {item.state === 'paused' && (
          <Button
            variant="icon"
            size="xs"
            rounded="rounded-full"
            onClick={() => resumeDownload(item.id)}
            aria-label="Resume"
          >
            <SvgIcon svg={playSvg} size={11} />
          </Button>
        )}
        {isActive && (
          <Button
            variant="danger"
            size="xs"
            rounded="rounded-full"
            onClick={() => cancelDownload(item.id)}
            aria-label="Cancel"
          >
            <SvgIcon svg={closeSvg} size={11} />
          </Button>
        )}
        {item.state === 'completed' && (
          <>
            <Button
              variant="icon"
              size="xs"
              rounded="rounded-full"
              onClick={() => openDownload(item.id)}
              aria-label="Open download"
            >
              <SvgIcon svg={downloadSvg} size={11} />
            </Button>
            <Button
              variant="icon"
              size="xs"
              rounded="rounded-full"
              onClick={() => showInFolder(item.id)}
              aria-label="Show in folder"
            >
              <SvgIcon svg={folderSvg} size={11} />
            </Button>
          </>
        )}
        {(item.state === 'completed' || item.state === 'failed' || item.state === 'cancelled') && (
          <Button
            variant="danger"
            size="xs"
            rounded="rounded-full"
            onClick={() => removeDownload(item.id)}
            className="opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Remove download"
          >
            <SvgIcon svg={closeSvg} size={11} />
          </Button>
        )}
      </div>
    </div>
  )
})

function DownloadPillInner(): React.JSX.Element {
  const downloads = useDownloadStore((s) => s.downloads)
  const uiLayout = useSettingsStore((s) => s.uiLayout)
  const popoverBelow = uiLayout === 'classic'
  const { enterY, exitY } = getPopoverMotion(popoverBelow)
  const isOpen = useUIStore((s) => s.isDownloadPopoverOpen)
  const setDownloadPopoverOpen = useUIStore((s) => s.setDownloadPopoverOpen)
  const containerRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null)
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLayoutEffect(() => {
    if (!isOpen || !containerRef.current) {
      setPopoverPos(null)
      return
    }
    const rect = containerRef.current.getBoundingClientRect()
    const left = Math.max(8, Math.min(rect.right - DOWNLOAD_POPOVER_WIDTH, window.innerWidth - DOWNLOAD_POPOVER_WIDTH - 8))
    const top = clampPopoverTop(rect, DOWNLOAD_POPOVER_HEIGHT, popoverBelow)
    setPopoverPos({ left, top })
  }, [isOpen, popoverBelow])

  const items = useMemo(
    () => Object.values(downloads).sort((a, b) => b.startTime - a.startTime),
    [downloads]
  )

  const hasItems = items.length > 0
  const activeCount = items.filter((d) => d.state === 'progressing' || d.state === 'paused').length
  const hasActive = activeCount > 0

  // Aggregate progress for the circular indicator
  const aggregateProgress = useMemo(() => {
    const active = items.filter((d) => d.state === 'progressing')
    if (active.length === 0) return 1
    const total = active.reduce((s, d) => s + d.totalBytes, 0)
    const received = active.reduce((s, d) => s + d.receivedBytes, 0)
    return total > 0 ? received / total : 0
  }, [items])

  // Auto-hide 8s after all downloads complete
  useEffect(() => {
    if (autoHideRef.current) clearTimeout(autoHideRef.current)
    if (hasItems && !hasActive) {
      autoHideRef.current = setTimeout(() => {
        // Read fresh state inside the timeout — not the stale `items` closure
        const store = useDownloadStore.getState()
        const currentDownloads = Object.values(store.downloads)
        for (const dl of currentDownloads) {
          if (dl.state !== 'progressing' && dl.state !== 'paused') {
            store.removeDownload(dl.id)
          }
        }
      }, 8000)
    }
    return () => {
      if (autoHideRef.current) clearTimeout(autoHideRef.current)
    }
  }, [hasItems, hasActive])

  const handleOpenPage = useCallback(() => {
    useUIStore.getState().toggleDownloads()
    setDownloadPopoverOpen(false)
  }, [setDownloadPopoverOpen])

  // Close dropdown when all items are cleared
  useEffect(() => {
    if (!hasItems) setDownloadPopoverOpen(false)
  }, [hasItems, setDownloadPopoverOpen])

  // Circular progress SVG params
  const radius = 7
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - aggregateProgress)
  const triggerClassName = popoverBelow
    ? 'h-9 rounded-lg flex items-center justify-center bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)] px-2.5 gap-1.5 select-none hover:bg-[var(--app-control-hover)] active:scale-95 transition-colors duration-100'
    : 'h-10 rounded-full flex items-center justify-center bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)] px-3 gap-1.5 select-none hover:bg-[var(--app-control-hover)] active:scale-95 transition-colors duration-100'

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence>
        {hasItems && (
          <Button
            variant="solid"
            size="none"
            key="download-pill"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ ...SPRING_EXPAND, opacity: { duration: 0.15 } }}
            style={{ overflow: 'hidden', flexShrink: 0 }}
            onClick={() => setDownloadPopoverOpen(!isOpen)}
            aria-label="Downloads"
            className={triggerClassName}
          >
            <div className="relative">
              <SvgIcon svg={downloadSvg} size={15} className={hasActive ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-secondary)]'} />
              {hasActive && (
                <svg
                  className="absolute -inset-[5px]"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  style={{ transform: 'rotate(-90deg)' }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="text-[var(--app-accent)] transition-[stroke-dashoffset] duration-150"
                  />
                </svg>
              )}
            </div>
            {activeCount > 0 && (
              <Text as="span" size="caption" tone="accent" className="font-semibold tabular-nums">{activeCount}</Text>
            )}
          </Button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && hasItems && popoverPos && (
          <m.div
            className="fixed z-[100] w-[300px] max-h-[320px] rounded-xl overflow-hidden bg-[var(--app-bg-tertiary)] border border-[var(--app-separator)] text-[var(--app-text-primary)]"
            style={{ left: popoverPos.left, top: popoverPos.top, originY: popoverBelow ? 0 : 1, originX: 1 }}
            initial={{ scale: 0.98, opacity: 0, y: enterY }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: exitY }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                <Text as="span" size="caption" tone="muted" className="font-semibold uppercase tracking-wide">
                  Downloads
                </Text>
                <Button
                  variant="link"
                  size="xs"
                  onClick={handleOpenPage}
                >
                  See all
                </Button>
              </div>
              <div className="overflow-y-auto max-h-[270px] px-1 pb-1 glass-scroll">
                {items.slice(0, 10).map((item) => (
                  <DownloadRow key={item.id} item={item} />
                ))}
              </div>
            </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const DownloadPill = memo(DownloadPillInner)
