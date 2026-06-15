import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { SvgIcon } from '@/components/ui/SvgIcon'
import lockFillSvg from '@/assets/icons/Objects/Lock_Fill.svg?raw'
import globeSvg from '@/assets/icons/Nature/Globe.svg?raw'
import { SPRING_POPUP } from '@/utils/springs'
import { showToast } from '@/components/ui/Toast'
import { useUIStore } from '@/store/uiStore'
import {
  getOriginFromUrl,
  SITE_PERMISSION_LABELS,
  type SitePermissionEntry,
  useSitePermissionsStore,
} from '@/store/sitePermissionsStore'

interface SiteInfoPopoverProps {
  isOpen: boolean
  onClose: () => void
  url: string
  isSecure: boolean
}

const EMPTY_PERMISSION_ENTRIES: SitePermissionEntry[] = []

export const SiteInfoPopover = memo(function SiteInfoPopover({ isOpen, onClose, url, isSecure }: SiteInfoPopoverProps) {
  const [siteInfo, setSiteInfo] = useState<Awaited<ReturnType<typeof window.electronAPI.getSiteInfo>> | null>(null)
  const origin = useMemo(() => getOriginFromUrl(url), [url])
  const permissionEntriesByKey = useSitePermissionsStore((s) => s.entries)
  const permissionEntries = useMemo(() => {
    if (!origin) return EMPTY_PERMISSION_ENTRIES
    return Object.values(permissionEntriesByKey)
      .filter((entry) => entry.origin === origin)
      .sort((a, b) => a.permission.localeCompare(b.permission))
  }, [origin, permissionEntriesByKey])
  const resetOrigin = useSitePermissionsStore((s) => s.resetOrigin)

  useEffect(() => {
    if (!isOpen || !origin) {
      setSiteInfo(null)
      return
    }
    let cancelled = false
    window.electronAPI.getSiteInfo(url).then((info) => {
      if (!cancelled) setSiteInfo(info)
    })
    return () => {
      cancelled = true
    }
  }, [isOpen, origin, url])

  const handleClearSiteData = useCallback(async () => {
    if (!origin) return
    const ok = await window.electronAPI.clearSiteData(origin)
    showToast({ message: ok ? 'Site data cleared' : 'Could not clear site data', type: ok ? 'success' : 'error' })
    if (ok) {
      const info = await window.electronAPI.getSiteInfo(url)
      setSiteInfo(info)
    }
  }, [origin, url])

  const handleForgetSite = useCallback(async () => {
    if (!origin) return
    const ok = await window.electronAPI.forgetSite(origin)
    if (ok) resetOrigin(origin)
    showToast({ message: ok ? 'Site forgotten' : 'Could not forget site', type: ok ? 'success' : 'error' })
    onClose()
  }, [origin, resetOrigin, onClose])

  const handleResetPermissions = useCallback(() => {
    if (!origin) return
    resetOrigin(origin)
    showToast({ message: 'Site permissions reset', type: 'success' })
  }, [origin, resetOrigin])

  const handleOpenPrivacySettings = useCallback(() => {
    onClose()
    useUIStore.getState().toggleSettings()
  }, [onClose])

  if (!isOpen) return null

  let hostname = ''
  try {
    hostname = new URL(url).hostname
  } catch {
    // ignore
  }

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <motion.div
        className="absolute top-full mt-2 left-0 w-80 p-4 rounded-2xl glass z-[100] shadow-xl border border-white/10 dark:border-white/5"
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={SPRING_POPUP}
        style={{ originY: 0, originX: 0 }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isSecure ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'}`}>
            <SvgIcon svg={isSecure ? lockFillSvg : globeSvg} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{hostname || 'Unknown Site'}</h3>
            <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
              {isSecure ? 'Connection is secure' : 'Your connection to this site is not secure'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            {isSecure
              ? 'Your connection is encrypted. Information you send is private.'
              : 'Your connection is not private. Avoid entering sensitive information on this site.'}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="rounded-xl bg-black/[0.04] dark:bg-white/[0.06] p-2">
              <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-neutral-500">Cookies</div>
              <div className="text-[13px] text-gray-800 dark:text-neutral-100">{siteInfo?.cookieCount ?? 0}</div>
            </div>
            <div className="rounded-xl bg-black/[0.04] dark:bg-white/[0.06] p-2">
              <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-neutral-500">Cache</div>
              <div className="text-[13px] text-gray-800 dark:text-neutral-100">
                {siteInfo ? `${Math.round(siteInfo.cacheSize / 1024 / 1024)} MB` : '0 MB'}
              </div>
            </div>
          </div>
          <div className="pt-2">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-neutral-500 mb-1">Protection</div>
            <div className="text-xs text-gray-600 dark:text-neutral-300">
              Ad and tracker blocking is {siteInfo?.adblockerEnabled ? 'enabled' : 'disabled'}.
            </div>
          </div>
          <div className="pt-2">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-neutral-500 mb-1">Permissions</div>
            {permissionEntries.length === 0 ? (
              <div className="text-xs text-gray-500 dark:text-neutral-400">No saved decisions for this site.</div>
            ) : (
              <div className="space-y-1">
                {permissionEntries.map((entry) => (
                  <div key={`${entry.origin}-${entry.permission}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-600 dark:text-neutral-300 truncate">
                      {SITE_PERMISSION_LABELS[entry.permission] ?? entry.permission}
                    </span>
                    <span className={`capitalize ${entry.decision === 'allow' ? 'text-green-600 dark:text-green-400' : entry.decision === 'deny' ? 'text-red-500' : 'text-gray-400'}`}>
                      {entry.decision}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-3">
            <button onClick={handleClearSiteData} className="px-3 py-2 rounded-xl text-[12px] bg-black/[0.04] dark:bg-white/[0.06] text-gray-700 dark:text-neutral-200 hover:bg-black/[0.07] dark:hover:bg-white/[0.1]">
              Clear data
            </button>
            <button onClick={handleResetPermissions} className="px-3 py-2 rounded-xl text-[12px] bg-black/[0.04] dark:bg-white/[0.06] text-gray-700 dark:text-neutral-200 hover:bg-black/[0.07] dark:hover:bg-white/[0.1]">
              Reset permissions
            </button>
            <button onClick={handleForgetSite} className="px-3 py-2 rounded-xl text-[12px] bg-red-500/[0.08] text-red-500 hover:bg-red-500/[0.14]">
              Forget site
            </button>
            <button onClick={handleOpenPrivacySettings} className="px-3 py-2 rounded-xl text-[12px] bg-blue-500/[0.08] text-blue-500 hover:bg-blue-500/[0.14]">
              Privacy settings
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
})
