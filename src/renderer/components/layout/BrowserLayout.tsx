import { memo, useEffect } from 'react'
import { TitleBar } from '@/components/layout/TitleBar'
import { URLBar } from '@/components/browser/URLBar'
import { WebViewManager } from '@/webview/WebViewManager'
import { useLRUTabManager } from '@/webview/useLRUTabManager'
import { useTabStore } from '@/store/tabStore'

function BrowserLayoutInner(): React.JSX.Element {
  useLRUTabManager()

  useEffect(() => {
    const state = useTabStore.getState()
    if (state.tabOrder.length === 0) {
      state.addTab()
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-surface-dim text-text overflow-hidden">
      <TitleBar />
      <div className="flex flex-col flex-1 min-h-0">
        <URLBar />
        <WebViewManager />
      </div>
    </div>
  )
}

export const BrowserLayout = memo(BrowserLayoutInner)
