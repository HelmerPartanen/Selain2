import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { m } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { Text } from '@/components/ui/Text'
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
    showToast({ message: ok ? 'Site data removed' : 'Site data could not be removed', type: ok ? 'success' : 'error' })
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
                scale: 0.98,
                opacity: 0,
                y: enterY,
              }
        }
        animate={{
          scale: 1,
          opacity: 1,
          y: 0,
        }}
        exit={
          disableAnimations
            ? undefined
            : {
                scale: 0.98,
                opacity: 0,
                y: exitY,
              }
        }
        transition={
          disableAnimations
            ? { duration: 0 }
            : {
                duration: 0.12,
                ease: 'easeOut',
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
                      ? 'bg-[var(--app-accent-bg)] text-[var(--app-success)]'
                      : 'bg-[var(--app-bg-tertiary)] text-[var(--app-text-secondary)]'
                  }`}
                >
                  <SvgIcon svg={isSecure ? lockFillSvg : globeSvg} size={20} />
                </div>

                <div className="flex-1 min-w-0">
                  <Text as="h3" size="body" tone="primary" className="truncate font-medium">
                    {hostname || 'Unknown site'}
                  </Text>
                  <Text size="caption" tone="muted" className="mt-0.5">
                    {isSecure ? 'Secure connection' : 'Connection is not secure'}
                  </Text>
                </div>
              </div>

              <div className="space-y-2">
                <Text size="caption" tone="muted">
                  {isSecure
                    ? 'Information you send is encrypted.'
                    : 'Avoid entering sensitive information on this site.'}
                </Text>

                <div className="grid grid-cols-2 gap-2">
                  <Card variant="surface">
                  <div>
                    <Text as="div" size="caption" tone="muted" className="text-[10px] uppercase tracking-wide">Cookies</Text>
                    <Text as="div" size="caption" tone="primary">{siteInfo?.cookieCount ?? 0}</Text>
                  </div>
                  </Card>

                  <Card variant="surface">
                  <div>
                    <Text as="div" size="caption" tone="muted" className="text-[10px] uppercase tracking-wide">Cache</Text>
                    <Text as="div" size="caption" tone="primary">
                      {siteInfo ? `${Math.round(siteInfo.cacheSize / 1024 / 1024)} MB` : '0 MB'}
                    </Text>
                  </div>
                  </Card>
                </div>

                <div className="pt-2">
                  <Text as="div" size="caption" tone="muted" className="mb-1 text-[10px] uppercase tracking-wide">Protection</Text>
                  <Text size="caption" tone="secondary">
                    Ad and tracker blocking is {siteInfo?.adblockerEnabled ? 'on' : 'off'}.
                  </Text>
                </div>

                <div className="pt-2">
                  <Text as="div" size="caption" tone="muted" className="mb-1 text-[10px] uppercase tracking-wide">Permissions</Text>
                  {permissionEntries.length === 0 ? (
                    <Text size="caption" tone="muted">No saved permissions.</Text>
                  ) : (
                    <div className="space-y-1">
                      {permissionEntries.map((entry) => (
                        <div key={`${entry.origin}-${entry.permission}`} className="flex items-center justify-between gap-2 text-xs">
                          <Text as="span" size="caption" tone="secondary" className="truncate">
                            {SITE_PERMISSION_LABELS[entry.permission] ?? entry.permission}
                          </Text>
                          <span
                            className={`capitalize ${
                              entry.decision === 'allow'
                                ? 'text-[var(--app-success)]'
                                : entry.decision === 'deny'
                                  ? 'text-[var(--app-danger)]'
                                  : 'text-[var(--app-text-tertiary)]'
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
                    variant="solid"
                    size="sm"
                    onClick={handleOpenPrivacySettings}
                    className="h-auto whitespace-normal"
                    style={{ transition: 'none' }}
                  >
                    Open privacy settings
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
