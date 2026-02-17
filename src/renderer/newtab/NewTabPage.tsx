import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import globeSvg from '@/assets/icons/Nature/Globe.svg?raw'
import { useHistoryStore } from '@/store/historyStore'
import { useTabStore } from '@/store/tabStore'
import { useSearchEngineStore } from '@/store/searchEngineStore'

// ─── Frequently Visited ──────────────────────────────────────────────────────

function getFaviconUrl(url: string): string {
  try {
    const u = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`
  } catch {
    return ''
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

interface SpeedDial {
  url: string
  title: string
  hostname: string
  faviconUrl: string
}

function FrequentlyVisited(): React.JSX.Element | null {
  const entries = useHistoryStore((s) => s.entries)

  const topSites: SpeedDial[] = useMemo(() => {
    // Aggregate by hostname, pick the most-visited URL per host
    const hostMap = new Map<string, { url: string; title: string; visits: number }>()
    for (const entry of entries) {
      const hostname = getHostname(entry.url)
      const existing = hostMap.get(hostname)
      if (!existing || entry.visitCount > existing.visits) {
        hostMap.set(hostname, { url: entry.url, title: entry.title, visits: entry.visitCount })
      }
    }
    return Array.from(hostMap.values())
      .filter((s) => s.visits >= 2)
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 8)
      .map((s) => ({
        url: s.url,
        title: s.title || getHostname(s.url),
        hostname: getHostname(s.url),
        faviconUrl: getFaviconUrl(s.url)
      }))
  }, [entries])

  const handleNavigate = useCallback((url: string) => {
    const store = useTabStore.getState()
    const activeId = store.activeTabId
    if (activeId) {
      store.updateTab(activeId, { url })
    }
  }, [])

  if (topSites.length === 0) return null

  return (
    <div className="w-full max-w-[380px]">
      <div className="grid grid-cols-4 gap-2">
        {topSites.map((site, i) => (
          <motion.button
            key={site.hostname}
            onClick={() => handleNavigate(site.url)}
            className="flex flex-col items-center justify-center gap-1.5 aspect-square rounded-xl border border-transparent hover:bg-white/15 hover:border-white/15 transition-all duration-150 active:scale-[0.95] group"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
              {site.faviconUrl ? (
                <img
                  src={site.faviconUrl}
                  alt=""
                  className="w-6 h-6 rounded-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                    ;(e.target as HTMLImageElement).nextElementSibling as HTMLElement | null
                  }}
                />
              ) : (
                <SvgIcon svg={globeSvg} size={20} className="text-white/50" />
              )}
            </div>
            <span className="text-[11px] font-medium text-white/70 group-hover:text-white/90 truncate w-full text-center transition-colors duration-150">
              {site.hostname}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function NewTabPageInner(): React.JSX.Element {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center select-none px-6">
      <FrequentlyVisited />
    </div>
  )
}

export const NewTabPage = memo(NewTabPageInner)
