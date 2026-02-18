/* eslint-disable @typescript-eslint/no-empty-object-type */
import type React from 'react'
import type { ElectronAPI } from '../preload/types'

// Electron webview tag types for the renderer process
declare global {
  /** App version injected at build time by electron-vite */
  const __APP_VERSION__: string

  interface Window {
    electronAPI: ElectronAPI
  }

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

    interface NativeImage {
      toDataURL(options?: { scaleFactor?: number }): string
      toPNG(): Buffer
      toJPEG(quality: number): Buffer
      getSize(): { width: number; height: number }
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

    interface DidFailLoadEvent extends Event {
      readonly errorCode: number
      readonly errorDescription: string
      readonly validatedURL: string
      readonly isMainFrame: boolean
    }

    interface IpcRendererEvent extends Event {
      sender: unknown
    }
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.WebViewHTMLAttributes<HTMLWebViewElement>,
        HTMLWebViewElement
      >
    }
  }
}

// Augment React's WebViewHTMLAttributes to include 'allow' and fix plugins/allowpopups types
declare module 'react' {
  interface WebViewHTMLAttributes<T> {
    allow?: string
    plugins?: boolean | string
    allowpopups?: boolean | string
  }
}
