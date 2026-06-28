import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { m } from 'motion/react'
import { GroupBox } from '@/components/ui/GroupBox'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { SvgIcon } from '@/components/ui/SvgIcon'
import { SettingGroup, SettingRow, Toggle } from '@/settings/components/SettingsShared'
import { showToast } from '@/components/ui/toastStore'
import clockwiseSvg from '@/assets/icons/Arrows/Round_Arrows_2.svg?raw'

interface ManagedExtension {
  id: string
  name: string
  version: string
  path: string
  enabled: boolean
  permissions: string[]
}

function riskFor(permissions: string[]): { label: string; tone: 'accent' | 'danger' | 'muted' } {
  if (permissions.some((permission) => permission.includes('<all_urls>') || permission.includes('*://*/*'))) {
    return { label: 'High access', tone: 'danger' }
  }
  if (permissions.some((permission) => ['webRequest', 'cookies', 'tabs', 'scripting'].includes(permission))) {
    return { label: 'Review access', tone: 'danger' }
  }
  if (permissions.length > 0) return { label: 'Limited access', tone: 'muted' }
  return { label: 'Low access', tone: 'accent' }
}

function ExtensionsPaneInner(): React.JSX.Element {
  const [extensions, setExtensions] = useState<ManagedExtension[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  const refresh = useCallback(async () => {
    setRefreshTick((tick) => tick + 1)
    setExtensions(await window.electronAPI.listExtensions())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const loadExtension = useCallback(async () => {
    setIsLoading(true)
    const extension = await window.electronAPI.loadExtension()
    setIsLoading(false)
    if (extension) {
      setExtensions((items) => [...items.filter((item) => item.id !== extension.id), extension])
      showToast({ message: `${extension.name} loaded`, type: 'success' })
    }
  }, [])

  const toggleExtension = useCallback(async (id: string, enabled: boolean) => {
    const ok = await window.electronAPI.setExtensionEnabled(id, enabled)
    if (!ok) {
      showToast({ message: 'Extension could not be changed', type: 'error' })
      return
    }
    await refresh()
  }, [refresh])

  const removeExtension = useCallback(async (id: string) => {
    const ok = await window.electronAPI.removeExtension(id)
    if (!ok) {
      showToast({ message: 'Extension could not be removed', type: 'error' })
      return
    }
    setExtensions((items) => items.filter((item) => item.id !== id))
  }, [])

  const rows = useMemo(() => extensions, [extensions])

  return (
    <div className="space-y-7">
      <GroupBox
        title="Extension manager"
        desc="Load trusted unpacked extensions and review what they can access."
      >
        <div className="flex gap-2">
          <Button variant="primary" size="md" onClick={loadExtension} disabled={isLoading}>
            Load unpacked extension
          </Button>
          <Button variant="subtle" size="md" onClick={() => void refresh()} aria-label="Refresh extensions">
            <m.span
              initial={false}
              animate={{ rotate: refreshTick * 360 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="flex"
            >
              <SvgIcon svg={clockwiseSvg} size={14} />
            </m.span>
            Refresh
          </Button>
        </div>
      </GroupBox>

      <GroupBox title="Installed extensions" desc="Disable anything you do not recognize or need.">
        <SettingGroup>
          {rows.length === 0 ? (
            <Text size="caption" tone="tertiary" className="px-3.5 py-3">
              No managed extensions loaded.
            </Text>
          ) : (
            rows.map((extension) => {
              const risk = riskFor(extension.permissions)
              return (
                <SettingRow
                  key={extension.id}
                  label={`${extension.name} ${extension.version}`}
                  desc={`${risk.label} - ${extension.permissions.length ? extension.permissions.join(', ') : 'No declared permissions'}`}
                >
                  <div className="flex items-center gap-2">
                    <Text size="caption" tone={risk.tone} className="whitespace-nowrap">
                      {risk.label}
                    </Text>
                    <Toggle
                      checked={extension.enabled}
                      onChange={(enabled) => void toggleExtension(extension.id, enabled)}
                      label={`${extension.enabled ? 'Disable' : 'Enable'} ${extension.name}`}
                    />
                    <Button variant="danger" size="xs" onClick={() => void removeExtension(extension.id)}>
                      Remove
                    </Button>
                  </div>
                </SettingRow>
              )
            })
          )}
        </SettingGroup>
      </GroupBox>
    </div>
  )
}

export const ExtensionsPane = memo(ExtensionsPaneInner)
