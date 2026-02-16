import { memo, useEffect } from 'react'
import { TitleBar } from '@/components/layout/TitleBar'
import { Sidebar, useSidebar } from '@/components/layout/Sidebar'
import { URLBar } from '@/components/browser/URLBar'
import { WebViewManager } from '@/webview/WebViewManager'
import { useLRUTabManager } from '@/webview/useLRUTabManager'
import { useTabStore } from '@/store/tabStore'

function BrowserLayoutInner(): React.JSX.Element {
  const { isOpen, toggle } = useSidebar()

  useLRUTabManager()

  useEffect(() => {
    const state = useTabStore.getState()
    if (state.tabOrder.length === 0) {
      state.addTab()
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-surface text-text overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar isOpen={isOpen} onToggle={toggle} />
        <div className="flex flex-col flex-1 min-w-0">
          <URLBar />
          <WebViewManager />
        </div>
      </div>
    </div>
  )
}

export const BrowserLayout = memo(BrowserLayoutInner)
