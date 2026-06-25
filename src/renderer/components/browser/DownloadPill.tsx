import { memo, useCallback, useMemo, useRef, useEffect, useLayoutEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { SvgIcon, PAUSE_SVG } from '@/components/ui/SvgIcon'
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

import { SPRING_EXPAND, SPRING_POPUP } from '@/utils/springs'

const DOWNLOAD_POPOVER_WIDTH = 300
const DOWNLOAD_POPOVER_HEIGHT = 320

const DownloadRow = memo(function DownloadRow({ item }: { item: DownloadItem }): React.JSX.Element {
  const { pauseDownload, resumeDownload, cancelDownload, openDownload, showInFolder, removeDownload } = useDownloadStore.getState()
  const progress = item.totalBytes > 0 ? item.receivedBytes / item.totalBytes : 0
  const isActive = item.state === 'progressing' || item.state === 'paused'

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors duration-75 group">
      <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
        {item.state === 'completed' ? (
          <SvgIcon svg={checkSvg} size={12} className="text-green-500" />
        ) : (
          <SvgIcon svg={downloadSvg} size={12} className="text-blue-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-gray-800 dark:text-neutral-200 truncate">
          {item.filename}
        </div>
        {isActive && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 h-[3px] rounded-full bg-gray-200 dark:bg-neutral-700 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-[width] duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 dark:text-neutral-500 tabular-nums flex-shrink-0">
              {Math.round(progress * 100)}%
            </span>
          </div>
        )}
        {item.state === 'completed' && (
          <div className="text-[10px] text-gray-400 dark:text-neutral-500 mt-0.5">
            {formatBytes(item.totalBytes)}
          </div>
        )}
        {item.state === 'failed' && (
          <div className="text-[10px] text-red-400 mt-0.5">Failed</div>
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
            className="h-10 rounded-full flex items-center justify-center glass px-3 gap-1.5 select-none hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-95 transition-colors duration-100"
          >
            <div className="relative">
              <SvgIcon svg={downloadSvg} size={15} className={hasActive ? 'text-blue-500' : 'text-gray-600 dark:text-neutral-400'} />
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
                    className="text-blue-500 transition-[stroke-dashoffset] duration-300"
                  />
                </svg>
              )}
            </div>
            {activeCount > 0 && (
              <span className="text-xs font-semibold text-blue-500 tabular-nums">{activeCount}</span>
            )}
          </Button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && hasItems && popoverPos && (
          <motion.div
            className="fixed z-[100] w-[300px] max-h-[320px] rounded-xl overflow-hidden glass-heavy"
            style={{ left: popoverPos.left, top: popoverPos.top, originY: popoverBelow ? 0 : 1, originX: 1 }}
            initial={{ scaleY: 0.5, scaleX: 0.8, opacity: 0, y: enterY }}
            animate={{ scaleY: 1, scaleX: 1, opacity: 1, y: 0 }}
            exit={{ scaleY: 0.5, scaleX: 0.8, opacity: 0, y: exitY }}
            transition={{ ...SPRING_POPUP, opacity: { duration: 0.12 } }}
          >
              <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                <span className="text-xs font-semibold text-gray-500 dark:text-neutral-500 uppercase tracking-wide">
                  Downloads
                </span>
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
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const DownloadPill = memo(DownloadPillInner)
