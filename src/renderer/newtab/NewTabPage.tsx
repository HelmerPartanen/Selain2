import { memo, useCallback, useMemo } from 'react'
import { motion } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import globeSvg from '@/assets/icons/Nature/Globe.svg?raw'
import { useBookmarkStore } from '@/store/bookmarkStore'
import { useTabStore } from '@/store/tabStore'

// ─── Favourites (Bookmarks) ──────────────────────────────────────────────────

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

function Favourites(): React.JSX.Element | null {
  const bookmarks = useBookmarkStore((s) => s.bookmarks)

  const sites = useMemo(
    () =>
      bookmarks.slice(0, 8).map((b) => ({
        url: b.url,
        title: b.title || getHostname(b.url),
        hostname: getHostname(b.url),
        faviconUrl: getFaviconUrl(b.url)
      })),
    [bookmarks]
  )

  const handleNavigate = useCallback((url: string) => {
    const store = useTabStore.getState()
    const activeId = store.activeTabId
    if (activeId) {
      store.updateTab(activeId, { url })
    }
  }, [])

  if (sites.length === 0) return null

  return (
    <div className="w-full max-w-[380px]">
      <div className="grid grid-cols-4 gap-2">
        {sites.map((site, i) => (
          <motion.button
            key={site.url}
            onClick={() => handleNavigate(site.url)}
            className="flex flex-col items-center justify-center gap-1.5 aspect-square rounded-xl border border-transparent hover:border-white/15 transition-colors duration-150 group"
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ scale: 1.06, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25, delay: i * 0.04 }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
              {site.faviconUrl ? (
                <img
                  src={site.faviconUrl}
                  alt=""
                  className="w-6 h-6 rounded-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
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
      <Favourites />
    </div>
  )
}

export const NewTabPage = memo(NewTabPageInner)
