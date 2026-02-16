import { memo, useEffect } from 'react'
import { TitleBar } from '@/components/layout/TitleBar'
import { URLBar } from '@/components/browser/URLBar'
import { WebViewManager } from '@/webview/WebViewManager'
import { useLRUTabManager } from '@/webview/useLRUTabManager'
import { useTabStore } from '@/store/tabStore'

function BrowserLayoutInner(): React.JSX.Element {
  useLRUTabManager()
  const tabCount = useTabStore((s) => s.tabOrder.length)

  useEffect(() => {
    const state = useTabStore.getState()
    if (state.tabOrder.length === 0) {
      state.addTab()
    }
  }, [])

  const showTabStrip = tabCount > 1

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-zinc-100 overflow-hidden">
      <TitleBar visible={showTabStrip} />
      <div className="flex flex-col flex-1 min-h-0">
        <URLBar singleTab={!showTabStrip} />
        <WebViewManager />
      </div>
    </div>
  )
}

export const BrowserLayout = memo(BrowserLayoutInner)
