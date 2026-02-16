/* eslint-disable @typescript-eslint/no-empty-object-type */
import type React from 'react'

// Electron webview tag types for the renderer process
declare global {
  namespace Electron {
    interface WebviewTag extends HTMLElement {
      src: string
      partition: string
      loadURL(url: string): Promise<void>
      reload(): void
      stop(): void
      goBack(): void
      goForward(): void
      canGoBack(): boolean
      canGoForward(): boolean
      getURL(): string
      getTitle(): string
      isLoading(): boolean
      executeJavaScript(code: string): Promise<unknown>
      addEventListener(event: string, listener: EventListener): void
      removeEventListener(event: string, listener: EventListener): void
    }

    interface PageTitleUpdatedEvent extends Event {
      title: string
      explicitSet: boolean
    }

    interface PageFaviconUpdatedEvent extends Event {
      favicons: string[]
    }

    interface DidNavigateEvent extends Event {
      url: string
      httpResponseCode: number
      httpStatusText: string
    }

    interface DidNavigateInPageEvent extends Event {
      url: string
      isMainFrame: boolean
    }

    interface IpcRendererEvent extends Event {
      sender: unknown
    }
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string
          partition?: string
          preload?: string
          allowpopups?: boolean
          nodeintegration?: boolean
          disablewebsecurity?: boolean
          useragent?: string
          httpreferrer?: string
          webpreferences?: string
        },
        HTMLElement
      >
    }
  }
}
