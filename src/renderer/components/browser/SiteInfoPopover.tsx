import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { m } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import lockFillSvg from '@/assets/icons/Objects/Lock_Fill.svg?raw'
import globeSvg from '@/assets/icons/Nature/Globe_2_Fill.svg?raw'
import { Card } from "@/components/ui/Card";

import { showToast } from '@/components/ui/toastStore'
import { useUIStore } from '@/store/uiStore'
import { useSettingsStore } from '@/store/settingsStore'
import { getPopoverMotion } from '@/utils/popoverPosition'
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
  popoverDirection?: 'up' | 'down'
  anchorLeft?: boolean
}

const EMPTY_PERMISSION_ENTRIES: SitePermissionEntry[] = []

export const SiteInfoPopover = memo(function SiteInfoPopover({
  isOpen,
  onClose,
  url,
  isSecure,
  popoverDirection = 'up',
  anchorLeft = false,
}: SiteInfoPopoverProps) {
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

  const disableAnimations = useSettingsStore((s) => s.disableAnimations)

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  let hostname = ''
  try {
    hostname = new URL(url).hostname
  } catch {
    // ignore
  }

  const popoverBelow = popoverDirection === 'down'
  const { enterY, exitY } = getPopoverMotion(popoverBelow)

  return (

    <>
      {/* Click-away / dismiss */}
      <div
        className="fixed inset-0 z-[99]"
        onMouseDownCapture={(e) => {
          // If the down originated inside the popover, ignore.
          const target = e.target as HTMLElement | null;
          if (target?.closest?.('[data-site-info-popover]')) return;
          onClose();
        }}
      />

      {/* Wrapper/animation: same direction/material primitives as AppMenu */}
      <m.div
        className={`absolute z-[100] min-w-[280px] ${popoverBelow ? 'top-full mt-2' : 'bottom-full mb-2'} ${anchorLeft ? 'left-0' : 'left-1/2'}`}
        style={{ originX: anchorLeft ? 0 : 0.5, originY: popoverBelow ? 0 : 1, x: anchorLeft ? 0 : '-50%' }}

        initial={
          disableAnimations
            ? undefined
            : {
                scaleX: 0.15,
                scaleY: 0.04,
                opacity: 0,
                y: enterY,
                borderRadius: 40,
              }
        }
        animate={{
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          y: 0,
          borderRadius: 16,
        }}
        exit={
          disableAnimations
            ? undefined
            : {
                scaleX: 0.15,
                scaleY: 0.04,
                opacity: 0,
                y: exitY,
                borderRadius: 40,
              }
        }
        transition={
          disableAnimations
            ? { duration: 0 }
            : {
                type: 'spring',
                stiffness: 380,
                damping: 28,
                mass: 0.6,
                opacity: { duration: 0.12 },
              }
        }
      >
        <div
          className="rounded-xl mb-2 shadow-sm overflow-hidden bg-[var(--app-bg-primary)] border border-[var(--app-separator)] text-[var(--app-text-primary)]"
        >
          <div className="p-1 relative">
            <div className="p-3">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isSecure
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400'
                  }`}
                >
                  <SvgIcon svg={isSecure ? lockFillSvg : globeSvg} size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {hostname || 'Unknown Site'}
                  </h3>
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

                <div className="grid grid-cols-2 gap-2">
                  <Card variant="surface">
                  <div>
                    <div className="text-[10px] tracking-wide text-gray-400 dark:text-neutral-500">Cookies</div>
                    <div className="text-[13px] text-gray-800 dark:text-neutral-100">{siteInfo?.cookieCount ?? 0}</div>
                  </div>
                  </Card>

                  <Card variant="surface">
                  <div>
                    <div className="text-[10px] tracking-wide text-gray-400 dark:text-neutral-500">Cache</div>
                    <div className="text-[13px] text-gray-800 dark:text-neutral-100">
                      {siteInfo ? `${Math.round(siteInfo.cacheSize / 1024 / 1024)} MB` : '0 MB'}
                    </div>
                  </div>
                  </Card>
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
                          <span
                            className={`capitalize ${
                              entry.decision === 'allow'
                                ? 'text-green-600 dark:text-green-400'
                                : entry.decision === 'deny'
                                  ? 'text-red-500'
                                  : 'text-gray-400'
                            }`}
                          >
                            {entry.decision}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3">
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={handleClearSiteData}
                    className="h-auto whitespace-normal px-3 py-2"
                    style={{ transition: 'none' }}
                  >
                    Clear data
                  </Button>
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={handleResetPermissions}
                    className="h-auto whitespace-normal px-3 py-2"
                    style={{ transition: 'none' }}
                  >
                    Reset permissions
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleForgetSite}
                    className="h-auto whitespace-normal px-3 py-2"
                    style={{ transition: 'none' }}
                  >
                    Forget site
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenPrivacySettings}
                    className="h-auto whitespace-normal"
                    style={{ transition: 'none' }}
                  >
                    Privacy settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </m.div>
    </>
  )
})
