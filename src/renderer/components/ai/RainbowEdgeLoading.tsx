import { useSettingsStore } from '@/store/settingsStore'
import { CLASSIC_CHROME_HEIGHT } from '@/components/layout/layoutConstants'

/**
 * Full-browser summarizing indicator.
 * Adds a solid animated accent border around the inset browser area.
 */
export function RainbowEdgeLoading(): React.JSX.Element {
  const disableAnimations = useSettingsStore((s) => s.disableAnimations)
  const uiLayout = useSettingsStore((s) => s.uiLayout)
  const top = uiLayout === 'classic' ? CLASSIC_CHROME_HEIGHT : 0

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[151] pointer-events-none p-3.5"
      style={{ top }}
    >
      <style>{`
        @keyframes summary-glow-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes summary-border-enter {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div className="relative h-full w-full rounded-[10px]">
        <div
          className="absolute inset-0 overflow-hidden rounded-[10px]"
          style={{
            animation: disableAnimations ? undefined : 'summary-border-enter 0.18s ease-out 0.24s both',
          }}
        >
          <div
            className="absolute inset-0 rounded-[10px] border-2 border-[var(--app-accent)]"
            style={{
              animation: disableAnimations ? undefined : 'summary-glow-spin 2.6s linear infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default RainbowEdgeLoading
